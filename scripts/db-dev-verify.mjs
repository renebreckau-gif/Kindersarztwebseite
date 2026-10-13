// Verifies the isolated dev cluster (non-secret facts only).
// Run: node --env-file=.env.local scripts/db-dev-verify.mjs
import pg from "pg";

const app = new pg.Client({ connectionString: process.env.DATABASE_URI });
await app.connect();
const q = async (c, sql) => (await c.query(sql)).rows;
const [who] = await q(app, "select current_user, current_database(), inet_server_addr()::text as addr, inet_server_port() as port, version()");
const [role] = await q(app, "select rolsuper, rolcreatedb, rolcreaterole, rolcanlogin from pg_roles where rolname = current_user");
const [owner] = await q(app, "select pg_get_userbyid(datdba) as owner from pg_database where datname = current_database()");
const [listen] = await q(app, "select current_setting('listen_addresses') as listen_addresses, current_setting('password_encryption') as enc");
await app.end();

const su = new pg.Client({ connectionString: process.env.DEV_DB_SUPERUSER_URI });
await su.connect();
const dbs = (await q(su, "select datname, pg_get_userbyid(datdba) as owner from pg_database where not datistemplate order by 1")).map((r) => `${r.datname} (${r.owner})`);
const hba = (await q(su, "select type, database, user_name, address, auth_method from pg_hba_file_rules")).map((r) => `${r.type} ${r.database} ${r.user_name} ${r.address} ${r.auth_method}`);
await su.end();

console.log(JSON.stringify({ connectedAs: who.current_user, database: who.current_database, server: `${who.addr}:${who.port}`, version: who.version.split(",")[0], role, owner: owner.owner, ...listen, databases: dbs, hba }, null, 2));
