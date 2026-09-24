import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const files=readdirSync(root).filter(name=>name.endsWith('.js'));
for(const file of files){
  const source=readFileSync(new URL(file,root),'utf8');
  const check=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
  if(check.status!==0){console.error(file,check.stderr);process.exitCode=1;}
  for(const match of source.matchAll(/(?:from\s*|import\s*\()(['"])(\.\/[^'"]+)\1/g)){
    const imported=new URL(match[2],root);imported.search='';
    if(!existsSync(fileURLToPath(imported))){console.error('Missing import',file,match[2]);process.exitCode=1;}
  }
}
if(!process.exitCode)console.log(`Syntax and local imports: ${files.length} modules passed`);
