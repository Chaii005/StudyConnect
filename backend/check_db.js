const { Client } = require('pg');
const client = new Client({ host: 'db.auiksrjvcxbzemwdgmpb.supabase.co', port: 5432, user: 'postgres', password: 'vanhai005@@$$', database: 'postgres', ssl: { rejectUnauthorized: false } });
client.connect().then(() => client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).then(res => { console.log(res.rows); client.end(); }).catch(console.error);
