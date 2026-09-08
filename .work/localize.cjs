const ts=require('../frontend/node_modules/typescript');const fs=require('fs');const path=require('path');
const roots=['frontend/components','frontend/app'];
const attrs=new Set(['title','description','label','placeholder','aria-label','alt','loadingLabel','emptyMessage','message','helperText','caption','text','heading','subtitle','error']);
const strings=new Set();
function norm(x){return x.replace(/\s+/g,' ').trim().replace(/&amp;/g,'&').replace(/&rsquo;/g,'’').replace(/&quot;/g,'"').replace(/&#39;/g,"'");}
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const p of roots.flatMap(files).filter(p=>p.endsWith('.tsx')&&!/\.(test|spec)\./.test(p)&&!/(language-switcher|theme-switcher|global-error|app[\\/]layout)\.tsx$/.test(p))){
const s=fs.readFileSync(p,'utf8'); const sf=ts.createSourceFile(p,s,99,true,ts.ScriptKind.TSX);let edits=[],usesHook=false,usesServer=false;
const scopes=[];
function find(n){let name;
if(ts.isFunctionDeclaration(n))name=n.name?.text;
if(ts.isArrowFunction(n)||ts.isFunctionExpression(n)){let parent=n.parent;if(ts.isCallExpression(parent)&&parent.expression.getText(sf).includes('forwardRef')) parent=parent.parent;if(ts.isVariableDeclaration(parent))name=parent.name.getText(sf);}
if(name&&/^[A-Z]/.test(name)&&n.body)scopes.push(n);
ts.forEachChild(n,find)} find(sf);
const used=new Set();
function scope(n){for(let cur=n.parent;cur;cur=cur.parent)if(scopes.includes(cur))return cur;return null;}
function add(a,b,text){edits.push({a,b,text});}
function wrap(n,owner){add(n.getStart(sf),n.getEnd(),`_copy(${n.getText(sf)})`);used.add(owner);}
function visit(n){const owner=scope(n);if(owner){
if(ts.isJsxText(n)&&norm(n.text)){const text=norm(n.text);strings.add(text);add(n.getStart(sf),n.getEnd(),`{_copy(${JSON.stringify(text)})}`);used.add(owner);}
else if(ts.isJsxAttribute(n)&&attrs.has(n.name.getText(sf))&&n.initializer){if(ts.isStringLiteral(n.initializer)){strings.add(norm(n.initializer.text));add(n.initializer.getStart(sf),n.initializer.getEnd(),`{_copy(${JSON.stringify(norm(n.initializer.text))})}`);used.add(owner);}else if(ts.isJsxExpression(n.initializer)&&n.initializer.expression){wrap(n.initializer.expression,owner);return;}}
else if(ts.isJsxExpression(n)&&n.expression&&(ts.isJsxElement(n.parent)||ts.isJsxFragment(n.parent))&&!ts.isJsxElement(n.expression)&&!ts.isJsxSelfClosingElement(n.expression)&&!ts.isArrowFunction(n.expression)){
// Insert delimiters so nested JSX keeps its independent edits.
add(n.expression.getStart(sf),n.expression.getStart(sf),'_copy(');add(n.expression.getEnd(),n.expression.getEnd(),')');used.add(owner);
}
}
ts.forEachChild(n,visit)}visit(sf);
for(const fn of used){const async=fn.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword);const line=async?'const _copy = await getCopy();':'const _copy = useCopy();'; if(async)usesServer=true;else usesHook=true;
if(ts.isBlock(fn.body))add(fn.body.getStart(sf)+1,fn.body.getStart(sf)+1,'\n'+line+'\n');else {add(fn.body.getStart(sf),fn.body.getStart(sf),'{ '+line+' return ');add(fn.body.getEnd(),fn.body.getEnd(),'; }');}}
if(edits.length){let imports=(usesHook?"import { useCopy } from '@/lib/i18n/use-copy';\n":'')+(usesServer?"import { getCopy } from '@/lib/i18n/server-copy';\n":'');const directive=sf.statements[0];const pos=directive&&ts.isExpressionStatement(directive)&&ts.isStringLiteral(directive.expression)?directive.getEnd():0;add(pos,pos,'\n'+imports);edits.sort((a,b)=>b.a-a.a||b.b-a.b);let out=s;for(const e of edits)out=out.slice(0,e.a)+e.text+out.slice(e.b);fs.writeFileSync(p,out);}
}
fs.writeFileSync('.work/jsx-strings.json',JSON.stringify([...strings].sort(),null,2));console.log('JSX copy:',strings.size);
