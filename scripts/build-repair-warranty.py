from pathlib import Path
import html,json,shutil
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'manuals/repair-service-parts-warranty-2026-10-23.pdf'
PAGES=[[
 ('h','一、保固期限'),
 ('p','1. 全新零件：自完修日起提供3個月有限保固。'),
 ('p','2. 二手零件／其他維修零件：自完修日起提供1個月有限保固。'),
 ('p','3. 保固僅限本次維修單列明、更換之特定零件本身，不包含設備中其他未維修零組件；實際零件、完修日期及保固期間請填於本文件或維修單。'),
 ('h','二、保固除外責任'),
 ('p','再次送修時，經檢測確認故障與下列情形有關，且不屬本次維修應負責的瑕疵者，不適用免費保固。公司會說明檢測結果及故障關聯，費用先行報價。'),
 ('sub','1. 非本維修項目或連帶引發之故障'),
 ('p','由其他非本次更換之零組件異常，引發或波及本維修零件損壞，例如主機板短路、電源供應器供電不穩、電池老化或散熱系統不良；以及外部電源異常、雷擊、電壓不穩或天災所造成的二次損壞。'),
 ('sub','2. 人為或外力因素'),
 ('p','因摔落、碰撞、擠壓、重壓、進水、受潮、液體滲入、異物侵入（例如昆蟲或灰塵積聚造成短路），或私自拆機、改裝、非授權維修而造成的損壞。')
],[
 ('h','二、保固除外責任（續）'),
 ('sub','3. 正常耗損或外觀'),
 ('p','符合原廠規範的螢幕微小亮點、暗點，及外殼、線材正常使用產生的磨損、刮傷；本次維修原已約定處理的瑕疵仍依原約定辦理。'),
 ('sub','4. 軟體與系統問題'),
 ('p','因病毒、惡意軟體，或自行安裝不相容驅動程式、軟體所造成的系統異常，不屬零件保固。原約定另有軟體服務保固者，依該約定辦理。'),
 ('h','三、送修與判定原則'),
 ('p','1. 請提供本維修單或保固憑證；如有遺失，可用維修單號、設備序號或交易資料協助核對，不因憑證遺失即直接排除保固。'),
 ('p','2. 保固貼紙用於辨識維修零件及拆修狀況。若貼紙破損、撕除或移位，依維修紀錄與實際故障原因核對；不單以貼紙狀態認定全部保固失效。'),
 ('p','3. 如判定不在免費保固範圍，先向客戶說明原因及報價，取得同意後才進行維修。檢測、零件與收送費依事前約定辦理，不擅自新增費用。'),
 ('note','本約定不影響依法不得排除之消費者權利；如與法律強制規定牴觸，依該規定辦理。')
]]
fields=[('維修單號',''),('客戶／公司',''),('設備／型號',''),('設備序號',''),('完修日期',''),('服務聯絡方式','')]
# HTML uses editable blanks for case-specific information and keeps all content local to this tab.
css='''*{box-sizing:border-box}body{margin:0;background:#edf2f7;color:#18304b;font:17px/1.75 "Microsoft JhengHei",system-ui,sans-serif}.toolbar{max-width:850px;margin:18px auto;padding:16px;display:flex;flex-wrap:wrap;gap:12px;align-items:center}.toolbar button,.toolbar a{font:inherit;padding:12px 18px;background:#174eaf;color:white;border:0;border-radius:10px;text-decoration:none;cursor:pointer}.toolbar p{width:100%;font-size:15px;margin:0}.sheet{max-width:850px;margin:18px auto;background:white;padding:40px 46px;box-shadow:0 8px 30px #17304d14}header{border-bottom:3px solid #174eaf;padding-bottom:14px;margin-bottom:20px}.brand{color:#174eaf;font-weight:700;font-size:16px}h1{font-size:27px;line-height:1.4;margin:8px 0}h2{font-size:21px;color:#174eaf;margin:22px 0 10px}h3{font-size:18px;margin:16px 0 6px}p{margin:8px 0 12px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;margin:18px 0}.field{display:flex;gap:8px;align-items:baseline;font-size:16px}.blank{flex:1;border-bottom:1px solid #8da2bc;min-width:0;min-height:28px;overflow-wrap:anywhere;white-space:pre-wrap}.parts{border:1px solid #9fb2cb;padding:12px;margin:16px 0}.parts .blank{min-height:58px}.note{background:#eff6ff;border-left:4px solid #174eaf;padding:12px 16px;font-size:15px}.signatures{margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:24px}.signatures p{border-bottom:1px solid #9fb2cb;padding-bottom:22px;font-size:16px}.footer{margin-top:22px;border-top:1px solid #d7e1ee;padding-top:10px;font-size:13px;color:#52657c}.continuation{font-size:21px;margin-bottom:16px} [contenteditable]:focus{outline:3px solid #93baff;outline-offset:2px}@media(max-width:600px){.sheet{padding:24px 18px}.fields{grid-template-columns:1fr}h1{font-size:24px}.signatures{grid-template-columns:1fr}}@media print{@page{size:A4;margin:14mm}.toolbar{display:none!important}body{background:white;font-size:11.5pt;line-height:1.6}.sheet{max-width:none;margin:0;padding:0;box-shadow:none;break-after:page}.sheet:last-child{break-after:auto}h1{font-size:21pt}h2{font-size:15pt;break-after:avoid}h3{font-size:12pt;break-after:avoid}.fields{grid-template-columns:1fr 1fr;font-size:10pt}.field{font-size:10.5pt}.note{font-size:10pt}p,.field,.parts,.signatures{break-inside:avoid}.footer{font-size:9pt}.blank{outline:none!important}}'''
chunks=['<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>永捷｜維修服務暨零件保固條款</title><style>'+css+'</style><body><nav class="toolbar"><button type="button" onclick="window.print()">列印／另存PDF</button><a href="./manuals/repair-service-parts-warranty-2026-10-23.pdf" download>下載空白PDF</a><p>需要時另行提供，不會自動加入報價。可先填寫空白欄位；內容只留在此分頁，重新整理會清除，請先列印或另存PDF。</p></nav>']
for page,items in enumerate(PAGES,1):
 chunks.append('<article class="sheet"><header><div class="brand">永捷系統科技</div><h1>維修服務暨零件保固條款'+('（續）' if page==2 else '')+'</h1></header>')
 if page==1:
  chunks.append('<div class="fields">'+''.join('<div class="field"><span>'+label+'：</span><div class="blank" contenteditable="true" role="textbox" aria-label="'+label+'"></div></div>' for label,_ in fields)+'</div><div class="parts"><strong>本次更換零件／新品或二手／保固期間（請逐項填寫）</strong><div class="blank" contenteditable="true" role="textbox" aria-label="本次更換零件及保固期間"></div></div>')
 for kind,text in items:
  tag={'h':'h2','sub':'h3','p':'p','note':'p'}[kind];chunks.append('<'+tag+(' class="note"' if kind=='note' else '')+'>'+html.escape(text)+'</'+tag+'>')
 if page==2:chunks.append('<div class="signatures"><p>經辦人：　　　　　　　日期：</p><p>客戶確認（選填）：　　　　　　</p></div>')
 chunks.append('<footer class="footer">請與本次維修單一併核對及提供。｜2026.10.23 範本第1版｜第'+str(page)+'／2頁</footer></article>')
chunks.append('</body></html>');(ROOT/'repair-warranty.html').write_text(''.join(chunks),encoding='utf-8')
# PDF: two legible A4 pages with stable page breaks and no production customer data.
pdfmetrics.registerFont(TTFont('CJK','C:/Windows/Fonts/msjh.ttc',subfontIndex=0));pdfmetrics.registerFont(TTFont('CJKB','C:/Windows/Fonts/msjhbd.ttc',subfontIndex=0))
navy=colors.HexColor('#18304b');blue=colors.HexColor('#174eaf');width=A4[0]-88
styles={k:ParagraphStyle(k,fontName='CJKB' if k in ['h','sub','title'] else 'CJK',fontSize=size,leading=lead,wordWrap='CJK',textColor=blue if k=='h' else navy,spaceAfter=after) for k,size,lead,after in [('title',24,34,14),('h',16,25,10),('sub',12.5,20,5),('p',11.5,19,9),('note',10.2,17,9),('label',10.5,17,0)]}
def para(t,k='p'):return Paragraph(html.escape(t),styles[k])
def footer(c,doc):
 c.setFont('CJK',9);c.setFillColor(colors.HexColor('#52657c'));c.drawString(44,28,'永捷系統科技｜維修服務暨零件保固條款｜2026.10.23 範本第1版');c.drawRightString(A4[0]-44,28,f'{doc.page} / 2')
flow=[]
for page,items in enumerate(PAGES,1):
 flow.extend([para('永捷系統科技','sub'),para('維修服務暨零件保固條款'+('（續）' if page==2 else ''),'title')])
 if page==1:
  rows=[[para(fields[i][0]+'：________________','label'),para(fields[i+1][0]+'：________________','label')] for i in range(0,6,2)]
  table=Table(rows,colWidths=[width/2]*2);table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('BOX',(0,0),(-1,-1),.6,colors.HexColor('#b4c9e6'))]));flow.extend([table,Spacer(1,10),para('本次更換零件／新品或二手／保固期間：','label'),para('________________________________________________________','label'),Spacer(1,10)])
 for kind,text in items:flow.append(para(text,kind))
 if page==1:flow.append(PageBreak())
 else:flow.extend([Spacer(1,18),para('經辦人：________________　日期：________________','label'),Spacer(1,20),para('客戶確認（選填）：________________________________','label')])
OUT.parent.mkdir(parents=True,exist_ok=True)
SimpleDocTemplate(str(OUT),pagesize=A4,leftMargin=44,rightMargin=44,topMargin=40,bottomMargin=48,title='維修服務暨零件保固條款',author='永捷系統科技').build(flow,onFirstPage=footer,onLaterPages=footer)
r=PdfReader(OUT);assert len(r.pages)==2,len(r.pages)
text=''.join(p.extract_text() for p in r.pages);assert '3個月' in text and '1個月' in text and '視同放棄' not in text
FINAL=ROOT.parents[1]/'output/pdf/yongjie-repair-warranty-2026-10-23.pdf';FINAL.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(OUT,FINAL)
print(json.dumps({'pdf':str(FINAL),'pages':len(r.pages),'bytes':OUT.stat().st_size},ensure_ascii=False))
