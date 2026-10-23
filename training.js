export const TRAINING_SECTIONS = [
  {
    "id": "0",
    "title": "先看懂新版的三個改變",
    "steps": [
      "三套都採直接報價：填資料 → 看客戶預覽 → 保存到團隊 → 複製或列印。",
      "檢測、維修與租賃各自處理自己的費用，不跨程式帶入客戶或金額，也不自動折抵。",
      "主管可事後查詢版本與紀錄；沒有主管登入，不影響已開通員工日常報價。",
      "助理與已開通同等作業權限的 engineer@service5c.com.tw 可在三套估價、保存與查詢同團隊案件、複製及列印。主管不必登入或核准，同事也能正常工作。一般收送帳號仍只看自己的任務。"
    ],
    "notes": [
      "原價目、運費與計費公式沒有因流程簡化而改價。",
      "先學你每天用的保存、查詢及複製；其他功能需要時再看。"
    ]
  },
  {
    "id": "1",
    "title": "登入與員工分工",
    "steps": [
      "三套使用同一組員工帳號，各網站分別登入。選24小時、專用電腦30天或共用電腦僅本次登入。",
      "工程師帳號會顯示「助理同等作業權限」，可照助理方式報價。",
      "主管負責新增／停用員工、調整帳號權限、查看主管私有成本及發布公司公告；一般報價與收送安排不再等主管核准。",
      "忘記密碼時寄重設信，由本人開最新信件設定；不要把密碼交給同事。"
    ],
    "notes": [
      "先按更新團隊資料，必要時登出重登；停用或未開通帳號請找主管。",
      "離開時登出；本機草稿與團隊紀錄是分開保存的。"
    ]
  },
  {
    "id": "7",
    "title": "維修：建立獨立維修單",
    "steps": [
      "選設備、設備分類與故障問題。",
      "填客戶、零件、工時、收送及其他費用，按實際工作範圍估價。",
      "手動整包價格與明細不同時填報價調整原因，這段會給客戶看。",
      "有檢測費時，依獨立檢測單處理；本張只報維修及本次約定收送。"
    ],
    "notes": [
      "同一筆運費不要在兩張單都收；由經辦人按本次約定人工核對。",
      "區間估價要向客戶說明，確定金額依實際檢查與同意內容。"
    ]
  },
  {
    "id": "8",
    "title": "維修：保存與查詢",
    "steps": [
      "本機「儲存報價」保留在目前電腦。",
      "按「團隊紀錄／收送」，在「保存共用維修報價」選維修交付方式。",
      "安排收送時填約定時段與範圍，按「保存到團隊」。",
      "在「共用維修紀錄」查看明細、載入修改或查看歷史版本。",
      "另一位同事已更新時，保留自己的輸入並載入新版比較。"
    ],
    "notes": [
      "舊的檢測加維修紀錄保留唯讀；新的工作請另建維修單。",
      "直接完成報價與保存，依平常工作方式通知主管即可。"
    ]
  },
  {
    "id": "9",
    "title": "維修：客戶報價交付",
    "steps": [
      "展開客戶報價預覽，確認設備、故障、費用、調整原因及必要條件。",
      "本機按「複製摘要」或「儲存並列印」即可交付，不需要線上核准。",
      "共用清單可按「複製客戶報價」或「下載／列印客戶報價」。",
      "下載的HTML開啟後按列印；需要電子檔可另存PDF。"
    ],
    "notes": [
      "包含必要費用、服務範圍與調整原因，不帶工程師筆記或主管私有成本。",
      "依公司作業取得客戶同意，系統不會代替你與客戶確認。"
    ]
  },
  {
    "id": "15",
    "title": "收送：直接安排",
    "steps": [
      "先確認已保存案件的收送費、地址及時段。",
      "在集中排線新增路線，選人員、整趟時間，再依順序加取件及回送站點。",
      "保存路線後核對人員與時間，按「發布收送安排」。",
      "人員時間重疊、重複站點或先回送後取件時，系統會提醒修正。"
    ],
    "notes": [
      "檢測與維修各自處理自己的案件，不會自動跨單帶入或折抵。",
      "租賃報價不會自動建立檢測／維修的路線，仍依公司調度安排。"
    ]
  },
  {
    "id": "16",
    "title": "收送與案件完成",
    "steps": [
      "指定人員用本人帳號查看已發布任務，依站點順序回報。",
      "無法完成時寫原因並通知經辦人，別只為了清空清單按完成。",
      "先完成取件，才能回報回送完成。",
      "經辦人確認維修、交接及收款，再標記案件完成，不必等主管。"
    ],
    "notes": [
      "取消路線、交接與結案都有操作紀錄。",
      "新需求另外開單，不要覆寫舊案件的歷史金額。"
    ]
  },
  {
    "id": "17",
    "title": "主管：員工與事後管理",
    "steps": [
      "新增員工時核對電子郵件、姓名、角色與啟用狀態。",
      "未開通帳號交本人一次性連結設定密碼；既有帳號可寄重設信。",
      "離職或暫停使用時停用帳號，不能停用最後一位可用主管。",
      "主管可查看共用紀錄與異動時間，私有成本仍限主管。"
    ],
    "notes": [
      "助理與已開通工程師可自行估價與安排工作；主管不在線不會卡住。",
      "員工管理與公告發布仍不是一般員工可操作的功能。"
    ]
  },
  {
    "id": "18",
    "title": "公司公告：三套同步",
    "steps": [
      "主管登入後，在頁面上方「公司公告」展開「主管：發布／管理公告」。",
      "填標題與內容，按「發布公告」。只能填純文字，不需要排版。",
      "三套程式約30秒內更新；一般同事只需閱讀，不必打卡。",
      "要修改時選既有公告，改字後發布；不再適用時按下架，異動紀錄仍保留。"
    ],
    "notes": [
      "同一團隊三套共用公告，不必每套各發一次。",
      "已發布的公告仍可顯示；沒有公告也不影響報價。"
    ]
  },
  {
    "id": "19",
    "title": "新人練習與交班檢查",
    "steps": [
      "用清楚標示的練習資料體驗填資料、看預覽、複製三個步驟，不要把假單保存到正式團隊。",
      "交班前確認需共用的報價已保存，客戶約定與待確認事項有寫清楚。",
      "修改後保存新版，複製或列印最新內容，不沿用舊報價。",
      "不確定時先保留草稿，與助理或工程師確認；不要用主管帳號繞過問題。"
    ],
    "notes": [
      "成功提示會告訴你已保存或已複製；不設排行榜、不要求累積點數。",
      "2026-10-23 第4版。適用：檢測2.0.0、維修3.0.0、租賃2.0.0。"
    ]
  }
];

let dialog,returnFocus;
const make=(tag,text,cls='')=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;e.className=cls;return e;};
function createTraining(){
 dialog=make('dialog',undefined,'training-dialog');dialog.setAttribute('aria-labelledby','training-title');
 const header=make('header',undefined,'training-header');const title=make('h2','操作說明／教育訓練');title.id='training-title';
 const close=make('button','返回原畫面','training-close');close.type='button';close.onclick=()=>dialog.close();header.append(title,close);
 const intro=make('p','依照自己的工作找到章節，逐步操作。查看說明不會修改或送出報價，關閉後可回到原表單。','training-intro');
 const manual=make('div',undefined,'manual-actions');
 const openPdf=make('a','開啟／列印員工手冊 PDF');openPdf.href='./manuals/employee-handbook-2026-10-23-simple.pdf';openPdf.target='_blank';openPdf.rel='noopener noreferrer';
 const downloadPdf=make('a','下載員工手冊 PDF');downloadPdf.href='./manuals/employee-handbook-2026-10-23-simple.pdf';downloadPdf.download='';
 manual.append(make('p','三套程式共用完整手冊｜2026/10/23 第4版・22 頁。含新版客戶預覽、複製摘要、列印與另存PDF步驟；可下載保存或選印需要的頁面。'),openPdf,downloadPdf);
 const searchLabel=make('label','搜尋步驟（例如：新增員工、保存報價、回送）','training-search-label');searchLabel.htmlFor='training-search';
 const search=make('input');search.id='training-search';search.type='search';search.placeholder='輸入關鍵字';search.autocomplete='off';
 const results=make('p',undefined,'training-results');results.setAttribute('role','status');results.setAttribute('aria-live','polite');
 const nav=make('nav',undefined,'training-nav');nav.setAttribute('aria-label','操作說明章節');
 const content=make('div',undefined,'training-content');const sections=[];
 for(const [index,item] of TRAINING_SECTIONS.entries()){
  const details=make('details',undefined,'training-section');details.id='training-'+item.id;details.open=index===0;
  const summary=make('summary',item.title);const steps=make('ol');for(const step of item.steps)steps.append(make('li',step));
  const notes=make('div',undefined,'training-notes');for(const note of item.notes)notes.append(make('p',note));details.append(summary,steps,notes);content.append(details);sections.push({item,details});
  const b=make('button',item.title);b.type='button';b.onclick=()=>{search.value='';filter('');for(const s of sections)s.details.open=s.details===details;details.scrollIntoView({block:'start'});summary.focus();};nav.append(b);
 }
 function filter(value){const query=value.trim().toLocaleLowerCase('zh-TW');let count=0;for(const {item,details} of sections){const visible=[item.title,...item.steps,...item.notes].join(' ').toLocaleLowerCase('zh-TW').includes(query);details.hidden=!visible;if(query&&visible)details.open=true;if(visible)count++;}results.textContent=query?(count?`找到 ${count} 個相關章節`:'沒有找到相關步驟，請換個關鍵字，或清空搜尋查看全部。'):`共 ${sections.length} 個章節；可點章節名稱或展開下方步驟。`;}
 search.oninput=()=>filter(search.value);filter('');
 dialog.append(header,intro,manual,searchLabel,search,results,nav,content,make('p','版本 v3.0.0｜現有收費不變。正式作業以團隊最新核准版本及公司規定為準。','training-footer'));
 dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();});document.body.append(dialog);
}
export function openTraining(){if(!dialog)createTraining();returnFocus=document.activeElement;if(!dialog.open)dialog.showModal();dialog.querySelector('.training-close').focus();}
for(const button of document.querySelectorAll('[data-open-training]'))button.addEventListener('click',openTraining);
