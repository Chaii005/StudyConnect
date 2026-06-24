/**
 * imageCompress.js
 * Client-side image resize + compress bằng Canvas API (không cần dependency).
 * Giảm kích thước file ảnh trước khi upload lên Supabase Storage để giảm egress.
 */

/**
 * Compress / resize ảnh về maxWidth x maxHeight, giữ tỷ lệ.
 * Output: Blob (image/webp nếu browser hỗ trợ, fallback sang image/jpeg)
 *
 * @param {File|Blob} file     File ảnh đầu vào
 * @param {object}   options
 * @param {number}   options.maxWidth   Chiều rộng tối đa (px), mặc định 1280
 * @param {number}   options.maxHeight  Chiều cao tối đa (px), mặc định 1280
 * @param {number}   options.quality    Chất lượng 0–1, mặc định 0.78
 * @returns {Promise<File>} File mới đã compress (type: image/webp hoặc image/jpeg)
 */
export const compressImage = (file, {
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.78,
} = {}) => {
  return new Promise((resolve, reject) => {
    // Chỉ xử lý file ảnh
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được file ảnh'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Không load được ảnh'));
      img.onload = () => {
        let { width, height } = img;

        // Scale xuống nếu quá lớn
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Ưu tiên WebP (nhỏ hơn ~30% so với JPEG), fallback sang JPEG
        const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
        const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg';
        const ext = supportsWebP ? 'webp' : 'jpg';

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Canvas thất bại (hiếm) → trả về file gốc
              resolve(file);
              return;
            }
            // Nếu file đã nhỏ hơn sau compress thì dùng, ngược lại dùng file gốc
            if (blob.size >= file.size) {
              resolve(file);
              return;
            }
            const baseName = (file.name || 'image').replace(/\.[^.]+$/, '');
            const newFile = new File([blob], `${baseName}.${ext}`, { type: mimeType });
            resolve(newFile);
          },
          mimeType,
          quality
        );
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Compress avatar — nhỏ hơn, tối đa 400x400 px.
 * @param {File|Blob} file
 * @returns {Promise<File>}
 */
export const compressAvatar = (file) =>
  compressImage(file, { maxWidth: 256, maxHeight: 256, quality: 0.80 });
