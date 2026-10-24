export const TRAINING_SECTIONS = [
  {
    "id": "money-fields",
    "title": "檢測：填寫與新版金額欄位",
    "lead": "符號留在左邊，只在右邊輸入數字。原收費規則不變。",
    "steps": [
      "填客戶稱呼、設備型號及故障現象，再選設備與服務方式。故障現象會附在客戶報價，請寫得清楚。",
      "「NT$」表示新臺幣；貨車圖示表示收送或交通費。只輸入數字，不必再打NT$、逗號或負號。",
      "特殊減免、合約折抵填要扣除的正數，例如減免200元就填200；系統會扣除，請勿填-200。",
      "原廠檢測費及其他費用只填本次另外加收金額。不要把已列入的費用再填一次。",
      "客製化收送才填完整收送費；門市不收收送費，到府依目前方案計費。遠端基本費仍為500元。",
      "核對右側費用及客戶預覽，再保存或交付。維修另開維修程式，不從檢測帶入或自動折抵。"
    ],
    "notes": [
      "手機怎麼填：欄位上下排列，點數字欄輸入。符號不能編輯；清空不一定代表免費，請依欄位說明核對。",
      "有疑問先核對：看見錯誤提示先修正。只改畫面大小與對齊，沒有調整檢測、急件或收送收費規則。"
    ]
  },
  {
    "id": "rental-pricing",
    "title": "租賃：公版與客製化計價",
    "lead": "每個設備品項只採一種計價，不會把公版與客製價相加。",
    "steps": [
      "在「加入設備與服務」先選公版計價或客製化報價，再選設備並按「加入本張報價」。",
      "公版計價：核對台數與計費期數，系統依既有方案計算。半年填6個月、全年填12個月；日期不會自動改期數。",
      "客製化報價：填「每台整段基本租金」及必填的報價說明。不要填整批總額，也不要再乘天數。",
      "例如每台租15天共1,800元、3台：金額填1800，數量填3，期數填15天；基本租金共5,400元。",
      "客製價取代公版基本租金，仍乘台數；印表機超印費照原規則另計。切回公版會清除客製金額及說明。",
      "軟體、網路工程及特殊項目用人工單價，核對單位、期數與數量；空白為待估，確認免費才填0。"
    ],
    "notes": [
      "避免重複折扣：客製價預設不參加整案優惠。若另有約定，才到該品項「其他設定」勾選可優惠。",
      "先存本機也可以：客製金額未填可先存本機草稿；補齊金額後再保存團隊。已含螢幕或軟體不要重複加入品項。"
    ]
  },
  {
    "id": "rental-deposit-delivery",
    "title": "租賃：收送與押金怎麼填",
    "lead": "租金、收送費及押金分開看，押金不加入租金。",
    "steps": [
      "到STEP 03選交付方式。選自取自還不會自動收送；若原本有收送品項，請核對後手動移除。",
      "需要送裝時按「＋送裝費」，沿用公版800元／次，可依約改價。需要回收再按「＋回收費」，填本次約定金額。",
      "逐項核對收送名稱、每次費用、份數／數量、計費次數及服務範圍。例：送裝600、回收600，兩項各填600、數量1、次數1。",
      "在獨立押金區選「另收押金／免收押金／待確認」。另收時填整張報價的押金總額，不是每台押金。",
      "可按「帶入參考總額」再調整。參考額已乘公版設備台數，尚未含人工設備；免收需填原因，0元也須說明。",
      "核對稅額、付款安排及報價有效期限。租金2,700元加押金4,000元是分列的約定，不是把租金改成6,700元。"
    ],
    "notes": [
      "費用別漏填：選交付方式不會自動加費。回收沒有預設價格，未知留空；相同快捷項目不會重複加入。",
      "圖示怎麼看：貨車是收送費、NT$是金額。欄位只輸入數字；押金帶入參考不代表已收款。"
    ]
  },
  {
    "id": "rental-discounts",
    "title": "租賃：選用優惠與保存共用",
    "lead": "已談好客製價時，通常不用再填一次優惠。",
    "steps": [
      "需要折扣時展開「設備優惠（選用）」。選固定減免金額，或百分比；填10表示減10%，不是打1折。",
      "只優惠有勾選的設備基本租金。軟體、工程、收送、急件、碳粉及超印不參加；客製價預設不參加。",
      "有優惠必填原因。要取消整案優惠按「取消本次優惠」；這不會改掉品項本身的客製價。",
      "核對客戶預覽與內部待辦。按「團隊紀錄」，再按「保存到團隊」，成功提示才代表共用保存完成。",
      "同事從共用清單搜尋客戶或單號，載入後修改並保存新版；不要用舊版本覆蓋同事的新內容。"
    ],
    "notes": [
      "主管忙也可作業：助理與已開通同等權限的工程師可直接報價，不必等主管登入或核准。",
      "保存不是預約或收款：保存報價不會保留庫存、自動安排出車或自動收取押金。網路失敗先保留本機草稿。"
    ]
  },
  {
    "id": "customer-notes-warranty",
    "title": "客戶備註與需要時另印的保固條款",
    "steps": [
      "備註欄只保留輸入框。填寫適合提供客戶的維修說明，內容會出現在客戶報價的「服務內容」中，複製、Excel及列印一致。",
      "報價底部只保留1至5點報價聲明；獨立計費及金額區間的提醒放在費用區。",
      "客戶需要保固條款時，按頁首「維修保固條款（另印）」。可填本次維修單號、設備、完修日期及更換零件，再列印或另存PDF；也可下載空白PDF。",
      "保固範本預設全新零件3個月、二手／其他維修零件1個月，範圍限本次列明的維修零件；交付前核對實際品項、日期及約定。",
      "保固範本不會自動加入每張報價，也不會保存到團隊。若不在免費保固範圍，先說明檢測原因及費用，取得客戶同意後再處理。"
    ],
    "notes": [
      "備註會交給客戶，請勿放入內部成本或人員管理筆記。填寫保固頁後請先列印或另存PDF；重新整理會清除該頁填寫內容。"
    ]
  },
  {
    "id": "customer-declaration",
    "title": "客戶報價聲明",
    "steps": [
      "客戶預覽、複製摘要與列印使用相同的「報價聲明」。交付前核對費用、服務範圍、時程與是否仍有待確認項目。",
      "聲明會告知未列明的零件耗材、新增費用須取得同意、不維修的約定費用、維修時程及含稅價格。",
      "內部成本與管理資訊不帶入客戶版；給客戶的備註則會顯示；收送時段、調價原因及必要條件仍須清楚告知。"
    ],
    "notes": [
      "更新的是報價文字，沒有變更計價、收費或帳號權限。"
    ]
  },
  {
    "id": "company-pricebook",
    "title": "公司共用價目：新增、修改與前台連動",
    "steps": [
      "只有主管可在頁首按「資料庫管理」。助理與已開通工程師會自動取得相同公司價目，不必各台電腦設定。",
      "先新增類別，保存後會直接進入新增型號；再保存型號，接著在型號下新增故障。三層名稱不可空白或與同層重複。",
      "故障要填維修總估價下限、上限及基本工時。總估價含基本工時與預估零件；工時目前每小時350元。額外零件與運費於報價另外列入。",
      "新增及編輯故障時，下方「前台試算」會跟著價格與工時更新。最低估價低於基本工時費時，會說明依原計價採工時費為下限；本次沒有改變收費。",
      "保存成功才代表已更新公司價目。前台會立即出現新項目；同事約15秒內取得。",
      "修改既有項目，請在前台卡片按「編輯」。改完請重新選擇故障核對費用，避免沿用舊工時。",
      "同事正在報價時不會突然被換價，會顯示新版提示；按「更新價目並重新估價」後再選故障。團隊保存會再次檢查版本。",
      "價目備份下載的是目前公司價目；「舊本機價目備份」僅供比對，不會自動覆蓋公司資料。",
      "刪除上層類別會一併移除其型號及故障；既有報價與價目歷史版本保留。內建交機項目不能刪除。"
    ],
    "notes": [
      "已保存的客戶報價不隨新價目自動改價。載入舊案修改時會依目前價目重新估價，請核對後再保存新版本。",
      "主管同時修改時，系統會阻止舊版本覆蓋新版。請先下載目前輸入或記下內容，再重新整理確認。"
    ]
  },
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
    "title": "維修：金額、運費與工時",
    "lead": "先選設備與故障，再按實際服務調整。",
    "steps": [
      "選設備類別、型號及故障，查看系統建議的費用與工時。",
      "左側NT$及貨車圖示已置中。右側只填數字，不必加貨幣符號或負號。",
      "預設零件費填寫後會取代自動零件估價；額外零件及技術費只填另加的費用，再填額外項目名稱。",
      "運費填本次約定收送金額。工時與時薪是獨立欄位；依實際工作填寫，工時可用原本的0.5小時間隔。",
      "特殊折扣填減免的正數。手動總額填最低／單一金額，只有需要區間時才填最高金額。",
      "有調價時填「報價調整原因」，會交給客戶。備註也會附在服務內容，請勿填內部成本或人員管理筆記。"
    ],
    "notes": [
      "檢測與維修各自計費：檢測費依獨立檢測單處理，不跨單帶入或自動折抵；同一筆費用不要兩單都收。",
      "手機畫面：工時與時薪會依寬度分行。核對右側費用，再保存新版、複製或列印；不用等主管核准。"
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
    "title": "維修：客戶報價與另印保固條款",
    "lead": "備註只輸入一次，客戶預覽、複製、Excel與列印一致。",
    "steps": [
      "在「給客戶的備註」填維修說明，例如「已更換電容並完成測試」。欄位下方不再重複顯示預覽。",
      "展開客戶報價預覽，確認服務內容有備註，費用、調價原因及五點報價聲明正確。",
      "本機按「複製摘要」或「儲存並列印」；需要表格檔時選Excel。共用清單請輸出最新保存版本。",
      "列印視窗核對紙張與頁數，再列印；要電子檔時選另存PDF。不要把內部管理畫面當報價截圖。",
      "客戶需要保固條款時，按頁首「維修保固條款（另印）」。填單號、設備、完修日期及更換零件後列印，也可下載空白PDF。"
    ],
    "notes": [
      "保固範本：全新零件3個月、二手／其他維修零件1個月，限本次列明零件。交付前核對實際約定；範本不會自動加入每張報價。",
      "另印頁不會自動保存：填完請先列印或另存PDF；重新整理會清除另印頁的填寫內容。"
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
    "lead": "每天少做一步，比增加打卡更有幫助。",
    "steps": [
      "以測試資料練習：檢測填減免200、維修核對運費；租賃客製每台1,800元乘3台，確認基本租金5,400元。不要保存假單到正式團隊。",
      "交班前確認需共用的報價已保存，客戶約定與待確認事項有寫清楚。",
      "修改後保存新版，複製或列印最新內容，不沿用舊報價。",
      "不確定時先保留草稿，與助理或工程師確認；不要用主管帳號繞過問題。"
    ],
    "notes": [
      "輕量完成感：成功提示會告訴你已保存或已複製；不設排行榜、不要求累積點數。",
      "版本：2026-10-24 第5版。適用：檢測2.0.3、維修3.1.5、租賃2.1.3。含新版金額欄位、公版／客製化、收送及押金。"
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
 const openPdf=make('a','開啟／列印員工手冊 PDF');openPdf.href='./manuals/employee-handbook-2026-10-24.pdf';openPdf.target='_blank';openPdf.rel='noopener noreferrer';
 const downloadPdf=make('a','下載員工手冊 PDF');downloadPdf.href='./manuals/employee-handbook-2026-10-24.pdf';downloadPdf.download='';
 manual.append(make('p','三套程式共用完整手冊｜2026/10/24 第5版・22 頁。含新版金額欄位、租賃公版／客製化計價、收送、押金、客戶預覽與列印步驟。'),openPdf,downloadPdf);
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
