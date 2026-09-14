import {DatabaseSync} from 'node:sqlite';
export function database(path=':memory:') {
  const sql=new DatabaseSync(path);sql.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  const wrap=(query,args=[])=>({bind(...values){return wrap(query,values);},async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)},results:[]};}});
  return {sql,prepare:query=>wrap(query),async batch(statements){sql.exec('BEGIN IMMEDIATE');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
}
