from pathlib import Path
import re,base64,mimetypes,sys,json
root=Path(__file__).resolve().parents[1]/'dist'
html=(root/'index.html').read_text()
def data(path):return 'data:'+mimetypes.guess_type(path)[0]+';base64,'+base64.b64encode(path.read_bytes()).decode()
jsPath=re.search(r'<script[^>]+src="([^"]+)"[^>]*></script>',html).group(1)
cssPath=re.search(r'<link[^>]+href="([^"]+)"[^>]*>',html).group(1)
config=json.loads((root/'cloud-config.json').read_text())
js='window.__PINEHURST_CLOUD_CONFIG__='+json.dumps(config).replace('<',chr(92)+'u003c')+';'+chr(10)+(root/jsPath.lstrip('/')).read_text()
assert '"/assets/players/"+' in js
js=js.replace('"/assets/players/"+','')
for path in (root/'assets/players').glob('*.webp'):js=js.replace('"'+path.name+'"','"'+data(path)+'"')
css=(root/cssPath.lstrip('/')).read_text()
def inline(m):
 u=m.group(1).strip('\'"')
 if u.startswith('data:'):return m.group(0)
 p=root/u.lstrip('/') if u.startswith('/') else (root/cssPath.lstrip('/')).parent/u
 return 'url("'+data(p)+'")' if p.is_file() else m.group(0)
css=re.sub(r'url\(([^)]+)\)',inline,css)
html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>',lambda m:'<script type="module">'+js.replace('</script','<\\/script')+'</script>',html)
html=re.sub(r'<link[^>]+href="[^"]+"[^>]*>',lambda m:'<style>'+css+'</style>',html)
out=Path(sys.argv[1]) if len(sys.argv)>1 else root/'Pinehurst-Cup.html';out.write_text(html, encoding='utf-8')
print('Created',out,'size',out.stat().st_size)
