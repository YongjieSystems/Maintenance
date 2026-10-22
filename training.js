// 指定工程師可另外開通助理作業權限，涵蓋三套估價與同團隊共用案件；主管權限不變。
// 員工登入：三套使用同一帳號，各網站分別登入。主管可寄重設信，密碼由本人設定。
export const TRAINING_SECTIONS = [
 {id:'start',title:'1. 第一次使用：登入與整體流程',steps:[
  '開啟維修程式，按「使用員工帳號／團隊作業」；已在草稿畫面時，按上方「團隊／核准／收送」。',
  '輸入檢測系統已開通的員工電子郵件與密碼，按「登入團隊」，確認顯示的是自己的帳號及角色。登入保存方式可選24小時（預設）、個人專用電腦30天，或共用電腦僅本次登入。期限從登入起算，期間重新開啟可恢復；按登出會清除記住登入。',
  '有檢測案件：檢測報價同步 → 連結維修 → 完成維修草稿 → 同步維修 → 主管核准 → 正式報價與收送。',
  '沒有檢測案件：完成維修草稿 → 選服務方式 → 同步成新共用案件 → 主管核准 → 正式報價與收送。'],notes:[
  '本機儲存不等於團隊同步。同事看不到尚未同步的草稿。',
  '已取消共用密碼入口。請先用已啟用的主管或客服／行政帳號登入；助理依主管口頭確認仍可直接複製或列印客戶報價。現有價目與每小時350元設定不變。']},
 {id:'roles',title:'2. 各種角色可以做什麼？',steps:[
  '主管：管理員工、核准報價與折抵、分派工程師、發布或取消路線。',
  '客服／行政：建立及同步報價、查看共用版本、編排路線草稿；不能核准。',
  '工程師：預設查看分派案件；經系統管理者開通助理作業權限後，可使用三套估價及同團隊共用案件，仍可接工程師任務，但不能核准或管理員工。',
  '收送人員：查看自己的已發布路線及交接資訊，回報完成或無法完成；不取得維修金額版本。'],notes:['請使用自己的帳號。看不到功能時，先確認登入帳號與主管設定的角色。']},
 {id:'employees',title:'3. 新增員工、設定權限與停用（主管）',steps:[
  '主管登入團隊，往下找到「主管管理」，展開「員工名單與權限」。',
  '填員工電子郵件與姓名，選角色，勾選「啟用帳號」，按「保存員工權限」。請先核對電子郵件。',
  '新帳號在員工列表按「產生一次性開通連結（僅新帳號）」，私下交給該員工。系統不會自動寄信。',
  '由員工本人開啟連結，輸入至少 12 字元的新密碼，再輸入一次，按「設定我的密碼」。不要把密碼交給主管或助理。',
  '調整角色或停用：找到該員工，按「載入員工設定」，改角色或取消勾選「啟用帳號」，再按「保存員工權限」。'],notes:[
  '不能停用或降級最後一位已開通的主管。',
  '既有帳號忘記密碼，請聯絡系統管理者；一次性開通入口不會重設既有帳號，請勿重複新增。']},
 {id:'link',title:'4. 連結檢測案件，避免重複建案',steps:[
  '先確認檢測程式的報價已同步到團隊。只有存在本機歷史的紀錄，不會出現在共用列表。',
  '在維修程式開啟團隊頁，找到「維修報價同步與檢測費整合」。',
  '在「選擇已有檢測案件」選客戶案件，核對客戶與案件，按「連結並帶入檢測客戶資料」，確認後返回草稿。',
  '系統帶入客戶與故障說明；繼續選維修設備及項目，檢查費用。',
  '如果該案件已經有維修版本，到「共用維修案件與主管核准」找該案，按「載入維修（修改後另存版本）」，不要重新建立另一案。'],notes:[
  '客戶名稱不符時先停止，確認是否連錯案件。若客戶資料需修改，先更新檢測案件。',
  '「解除案件連結」會保留表單；下一次同步會建立新案。下一位客戶請用「＋ 新案件」，不要把舊客戶草稿直接同步為新案。']},
 {id:'quote',title:'5. 製作維修報價與手動調價',steps:[
  '在草稿畫面依序選「設備類型 → 設備分類 → 故障問題」，帶出預估金額及工時。',
  '逐項檢查預設零件／設備費、額外費用與名稱、工時、每小時計價、運費及折扣，不能只看總額。',
  '核對客戶，填設備序號、使用張數、報價人員及必要備註。',
  '已確認單一維修價格時，在「手動總額」的「最低／單一金額」填金額；最高金額留空就代表單一價格。',
  '手動總額與原明細不同時，填「報價調整原因」，例如「檢測後確認整包維修價格」。差額保留在內部明細；客戶版改列整包費用，並附上填寫的報價調整原因，請用適合提供客戶的文字。',
  '紅色提示存在時，先修正：費用不能是負數、最高價不能低於最低價、折扣不能超過最低費用小計；金額最多兩位小數。'],notes:[
  '「可能處理」是參考，檢測前不代表一定需要更換該零件。',
  '正式核准前須確認單一維修金額，不能仍使用預估價格區間。',
  '「本機價目表」不會改寫公司共用價目。團隊費用由伺服器使用核定價目重新計算，請檢查同步後明細。']},
 {id:'sync',title:'6. 同步共用案件、查看與修改版本',steps:[
  '完成草稿後，按「團隊／核准／收送」，核對目前連結的案件。',
  '填檢測折抵；沒有同意折抵時保持 0。按「同步目前維修草稿（送主管核准）」。',
  '確認畫面顯示同步成功、共用維修單號與版本；若失敗，不要當作已保存。',
  '沒有檢測案件時，保持未連結，選新案件服務方式「到店維修」或「收送維修」。收送須填約定時段及範圍，再同步成新案。',
  '修改既有共用案件，從該案按「載入維修（修改後另存版本）」，修改後再同步。舊版本可按「查看歷史版本（唯讀）」查看。'],notes:[
  '只按本機「儲存報價」，其他同事看不到。團隊列表約每 15 秒更新，也可按「更新團隊資料」。',
  '已連結檢測案件的服務方式沿用原設定；要變更，先更新檢測案件。',
  '顯示版本衝突時，先保留自己的修改，再載入最新版本，不要反覆按同步。共用單號與本機草稿單號不同時，以團隊紀錄為準。']},
 {id:'credit',title:'7. 檢測費折抵、收送扣除與待收金額',steps:[
  '沒有折抵安排時，「檢測費折抵」保持 0。需要折抵時填金額，隨維修報價同步，交主管核准。',
  '折抵不能超過原檢測報價扣除原收送／出勤費後的金額。',
  '按「檢視此版明細」，確認原檢測報價、維修小計、檢測折抵、重疊收送扣除及案件合計。',
  '範例：原檢測 500＋收送 300＝800；維修小計 1,000（其中又列收送 300）；核准折抵檢測 500。合計為 800＋1,000－500－300＝1,000 元。',
  '檢測與維修的同一收送費重複列出時，系統扣除兩邊收送費的較小值。原到府出勤費不是同一收送服務，不會被當成重複收送費扣除。'],notes:[
  '已收金額與預估待收須核對公司收款紀錄；系統不執行扣款、退款或會計入帳。',
  '折抵不是自動免收檢測費，現有價目沒有調整。']},
 {id:'approve',title:'8. 主管核准：檢測與維修分兩步',steps:[
  '有連結檢測案件時，先確認最新檢測報價已核准。尚未核准：到「共用案件」找該案，按「選取供主管處理」。',
  '在「主管管理」填核准原因，按「核准最新報價與減免」。這一步只核准檢測，不代表維修已核准。',
  '到「共用維修案件與主管核准」找該案，核對客戶、版本與明細；正式維修必須是單一金額。',
  '填「主管核准理由」及「客戶同意方式與時間」，例如「10 月 19 日上午 10:30，客戶透過 LINE 同意本版價格」。',
  '確實取得客戶同意後，按「核准本版維修與折抵」。直接建立、沒有檢測報價的維修案件，使用這個維修核准入口即可。'],notes:[
  '系統不會自動向客戶確認，請如實記錄同意方式及時間。',
  '修改維修費、折抵、折扣、運費或原檢測報價後，須重新同步並核准最新版本，不能沿用舊核准。']},
 {
 "id": "official",
 "title": "9. 客戶報價：先預覽，再複製或列印",
 "steps": [
  "填好設備、故障問題、客戶、費用與調整原因；先修正紅字。往下展開「客戶報價預覽」：電腦在右側估價區下方，手機往下滑到費用與備註後。",
  "依序核對「服務內容 → 費用明細 → 服務約定」。故障／處理項目與報價調整原因會帶出；整包議價只列整包費用。",
  "按「複製摘要」，看到成功提示後貼到LINE、郵件或文件，再核對客戶、設備、金額與調整原因。「Excel」輸出同一份客戶內容。",
  "按「儲存並列印」，核對瀏覽器列印預覽，再選印表機或「另存為PDF」。沒有儲存成功時先處理，不要當作已保存。",
  "特殊情況依主管口頭確認後可直接交付本機維修報價，不必等待線上核准；後續再向主管說明。估價區間、稅別、保固、交期及追加費用須先向客戶說明。",
  "需要團隊已核准正式版：同步維修及折抵，主管核准最新單一金額與客戶同意紀錄，再按「複製正式報價」。",
  "列印團隊正式版：按「下載正式報價（可列印）」，開啟HTML檔後按「列印報價」；需要電子檔時選另存PDF。改價後要重新同步、核准。"
 ],
 "notes": [
  "預覽、複製、Excel及列印共用客戶摘要。工程師筆記、員工部門、內部工時成本及主管核准理由不會帶出；報價調整原因會帶出，請用適合客戶閱讀的文字。",
  "本機交付不會自動建立團隊核准紀錄。共用案件、檢測費折抵及收送仍依團隊流程處理；備份檔不能當客戶報價。"
 ]
},
 {id:'routes',title:'10. 安排收送路線（客服／主管）',steps:[
  '先確認案件是收送服務，地址、範圍與約定時段已確認，需要的報價也已核准。收送人員或工程師帳號須先開通。',
  '到「集中排線」，展開「編排路線草稿」。新行程先按「另建空白路線」。',
  '填路線名稱、收送人員、整條路線開始與結束時間；日期時間都以臺北時間填寫。',
  '按「加入站點」，選案件、取件或回送，填地址與該站開始／結束時間。依實際行程順序加入其他站點。',
  '每站時間要包含交接與作業，站點之間要預留交通時間。取件與回送分開建立站點，不是一站代表兩趟。',
  '按「保存路線草稿」。主管在路線列表核對後，按「核准發布排線」，分派的人員才會看到。'],notes:[
  '系統會檢查人員時間重疊、重複任務、站點順序及核准，但不自動計算交通時間或最佳路徑。',
  '回送路線發布與完成回報時，都會再檢查最新維修核准。保存草稿不等於已發布。']},
 {id:'handover',title:'11. 收送人員回報與交接',steps:[
  '使用自己的員工帳號登入，找到「集中排線／我的任務」。',
  '查看分派給自己的已發布路線，依站點順序執行。',
  '實際完成交接後，填必要備註，按「回報已完成」。',
  '無法完成時，填原因，例如「客戶臨時外出，已通知客服重新約時間」，按「回報無法完成」。',
  '回送若因報價變更而被暫停，聯絡主管核准最新版本後再處理。'],notes:[
  '取件尚未完成，不能直接回報回送完成。',
  '交班前確認：報價已同步、核准版本正確、路線已發布、交接狀態已回報。']},
 {id:'help',title:'12. 常見問題、備份與每天檢查',steps:[
  '同事看不到報價：確認按的是團隊頁「同步目前維修草稿」，不是只有本機儲存。',
  '版本已被更新：先保留自己的修改，再載入最新版本。客戶名稱不符：先確認是否連錯案件。',
  '維修不能核准：確認單一金額、客戶同意紀錄，以及最新檢測報價已核准。',
  '路線不能發布：檢查報價核准、人員時間、重複站點及取送順序。看不到任務：確認已發布且分派的是本人。',
  '儲存失敗：保留畫面，先備份並聯絡主管；沒有成功訊息就不要當作已保存。',
  '本機「案件備份」保存已儲存的本機紀錄，不是雲端共用案件備份，也不包含尚未儲存的畫面；請先儲存再備份。換電腦或清除網站資料前先處理本機備份。',
  '看不到估價或團隊功能：確認員工名單已啟用且角色正確。忘記密碼：填電子郵件後按「忘記密碼／寄送重設信」，開啟最新信件由本人設定至少12字元密碼。主管也可在員工名單寄送重設信；不必重複新增帳號。'],notes:[
  '不確定費用或操作時，先保留草稿並詢問主管，不要用其他案件代替。']},
];

let dialog,returnFocus;
const make=(tag,text,cls='')=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;e.className=cls;return e;};
function createTraining(){
 dialog=make('dialog',undefined,'training-dialog');dialog.setAttribute('aria-labelledby','training-title');
 const header=make('header',undefined,'training-header');const title=make('h2','操作說明／教育訓練');title.id='training-title';
 const close=make('button','返回原畫面','training-close');close.type='button';close.onclick=()=>dialog.close();header.append(title,close);
 const intro=make('p','依照自己的工作找到章節，逐步操作。查看說明不會修改或送出報價，關閉後可回到原表單。','training-intro');
 const manual=make('div',undefined,'manual-actions');
 const openPdf=make('a','開啟／列印員工手冊 PDF');openPdf.href='./manuals/employee-handbook-2026-10-21.pdf';openPdf.target='_blank';openPdf.rel='noopener noreferrer';
 const downloadPdf=make('a','下載員工手冊 PDF');downloadPdf.href='./manuals/employee-handbook-2026-10-21.pdf';downloadPdf.download='';
 manual.append(make('p','三套程式共用完整手冊｜2026/10/21 第2版・22 頁。含新版客戶預覽、複製摘要、列印與另存PDF步驟；可下載保存或選印需要的頁面。'),openPdf,downloadPdf);
 const searchLabel=make('label','搜尋步驟（例如：新增員工、檢測折抵、回送）','training-search-label');searchLabel.htmlFor='training-search';
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
 dialog.append(header,intro,manual,searchLabel,search,results,nav,content,make('p','版本 v2.7.0｜現有收費不變。正式作業以團隊最新核准版本及公司規定為準。','training-footer'));
 dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();});document.body.append(dialog);
}
export function openTraining(){if(!dialog)createTraining();returnFocus=document.activeElement;if(!dialog.open)dialog.showModal();dialog.querySelector('.training-close').focus();}
for(const button of document.querySelectorAll('[data-open-training]'))button.addEventListener('click',openTraining);
