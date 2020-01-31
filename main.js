// ELECTRON RELATED
const electron = require("electron");
const url = require("url");
const path = require("path");
const {app,BrowserWindow,ipcMain} = electron;
const remote = electron.remote


//GW BOT RELATED
const nodeFetch = require('node-fetch')
const fetch = require('fetch-cookie')(nodeFetch)
const Store = require('data-store');
const store = new Store({ path: 'data.json' });
var moment = require('moment')
var colors = require('colors');
let readlineSync = require('readline-sync');

let UserData,AllUserData,requestState,forge_timeleft,industry_timeleft,industry_timediff,forge_timediff,wc,StaminaRequirement;
let ImportantValue = "";
let crimescount=0;

// These always change if the item is used up completely and then readded to your inventory!!!!
let StrangeSkull = 475604;
let LargeSkull = 486755n;
let SmallSkull = 486756;
let BeerID = 416679;

let ActionType = "crime";

let activated = false;

switch(ActionType){
    case "crime":
        StaminaRequirement = 1;
        break;

    case "casino":
        StaminaRequirement = 2;
        break;
    case "beer":
        StaminaRequirement = 3;
        break;
    default:
        console.log("ACTION TYPE NOT SET!!!");
        process.exit("ACTION TYPE NOT SET!!!")
}
 



// Set Enviornment
process.env.NODE_ENV = 'development';

let mainWindow;

// Listen for app to be ready
app.on('ready',function(){
    mainWindow = new BrowserWindow({
        frame:false,
        width:1024,
        height:600,
        minWidth: 1024,
        minHeight: 600,
        center:true
    });
  
    // Load HTML file into the window
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'login.html'),
        protocol:'file:',
        slashes: true
    }));

    // Quit App when closed
    mainWindow.on('closed',function(){
        app.quit();
    })
})

//request Catching
ipcMain.on('quit',function(){
    app.quit();
})

ipcMain.on('minimize',function(){
    mainWindow.minimize();
})

ipcMain.on('userlogin',function(e,loginInformation){
    console.log("Attempting to login..." + loginInformation[0])
    requestState = true;
    fetch("http://www.gangwarsmobile.com/index.php?p=profile", {"credentials":"same-origin","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8","accept-language":"en-US,en;q=0.9","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","upgrade-insecure-requests":"1"},"referrer":"http://www.gangwarsmobile.com/index.php?p=profile","referrerPolicy":"no-referrer-when-downgrade","body":"login=1&username="+loginInformation[0]+"&password="+loginInformation[1],"method":"POST","mode":"cors"})
    .then(res => res.text())
    .then((body) => {
        if(body.search('value="Register"') > 0){
            console.log("search found")
            mainWindow.webContents.send("userlogin:failed");
        }else{
            // Load HTML file into the window
            mainWindow.loadURL(url.format({
                pathname: path.join(__dirname, 'mainWindow.html'),
                protocol:'file:',
                slashes: true
            }));    
        }
    })
    .catch(error => {
        console.log(error);
    })
    .finally(() => {
        requestState = false;
        GetUserData();
        CheckDate();
    }); 
})

ipcMain.on('testCall',function(){
    // Load HTML file into the window
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'mainWindow.html'),
        protocol:'file:',
        slashes: true
    }));
})

ipcMain.on('loading-finished',function(){
    let loading_finished = true;
    updateData()
})

ipcMain.on('Item-IDs',function(e,ids){
    console.log("Item ID Change request Recieved")
    if(ids[0] !== ""){
        SmallSkull = ids[0];
        log("Small Skull ID Changed")
    }
    if(ids[1] !== ""){
        LargeSkull = ids[1];
        log("Large Skull ID Changed")
    }
    if(ids[2] !== ""){
        BeerID = ids[2];
        log("Beer ID Changed")
    }
})

// main.js 
function updateData(){
    if(loading_finished = true){
        //console.log("[JS] Update Data")
        mainWindow.webContents.send("update:userdata",UserData);
    }else{
        setTimeout(updateData,250);
    }
}

function log(text){
    //console.log(text);
    mainWindow.webContents.send("log-text",text);
}

//Bot Functionality
ipcMain.on('bot:toggle',function(e,bool){
    console.log("Bot Activated: " + bool)
    activated = bool;
    ActivateBot();
})

//===========================================================
//===========================================================
//===========================================================
//===========================================================
//===========================================================
// BOT RELATED //============================================
//===========================================================
//===========================================================
//===========================================================
//===========================================================
//===========================================================
//===========================================================
//===========================================================
//===========================================================
//===========================================================


function setDate(arg1){
    switch(arg1){
        case "forge":
            store.set('forge_date', moment(new Date())); 
            break;
        case "industry":
            store.set('industry_date',  moment(new Date())); 
            break;
        case "industry2":
            store.set('industry2_date',  moment(new Date())); 
            break;
        default: // should only get here if you're setting the date for the first time, hard coded.
            store.set('forge_date', moment(new Date())); 
            store.set('industry_date',  moment(new Date())); 
            store.set('industry2_date',  moment(new Date())); 
            process.exit(0);
    }
}

function CheckDate(){

    let currentTime = moment(new Date());
    console.log(currentTime);

    forge_timediff = currentTime.diff(store.data["forge_date"],'minutes');
    forge_timeleft = 245 - forge_timediff;

    industry_timediff = currentTime.diff(store.data["industry_date"],'minutes');
    industry_timeleft = 241 - industry_timediff;
    
    industry2_timediff = currentTime.diff(store.data["industry2_date"],'minutes');
    industry2_timeleft = 390 - industry2_timediff;
    

    if(forge_timeleft < 1){
        ForgeCollect();
    }

    // 1-15
    if(industry_timeleft < 1){ 
        IndustryCollect(false)
    }
    
    // 16-18
    if(industry2_timeleft < 1){
        IndustryCollect(true)
    }
}

function forceCollection(){
    ForgeCollect();
    IndustryCollect(false)
    IndustryCollect(true)
    setDate();
}

function GetUserData(){
    if(requestState == true){
        setTimeout(GetUserData,250)
    }else{
        requestState = true;
        //console.log("Getting User Data...")
        fetch("http://www.gangwarsmobile.com/index.php", {"credentials":"include","headers":{"accept":"*/*","accept-language":"en-US,en;q=0.9","content-type":"application/x-www-form-urlencoded; charset=UTF-8","x-requested-with":"XMLHttpRequest"},"referrer":"http://www.gangwarsmobile.com/index.php?p=inventory","referrerPolicy":"no-referrer-when-downgrade","body":"pageaction=_gameevents","method":"POST","mode":"cors"})
        .then(res => res.json())
        .then(json => AllUserData = json[0]["var"]["value"])
        .finally(() => {
            UserData = AllUserData["userdata"]
            requestState = false;
            updateData(); // Send the IPC Request
            CheckDate();
        });
    }
}

/// Bot Functionality Related Functions (Healing / Crimes)
function UseHealthKit(){
    if(activated == true){
        if(requestState == true){
            setTimeout(UseHealthKit,250)
        }else{
            log("Using Item: Large Health Kit...");
            requestState = true;
            fetch("http://www.gangwarsmobile.com/index.php", {"credentials":"include","headers":{"accept":"*/*","accept-language":"en-US,en;q=0.9","content-type":"application/x-www-form-urlencoded; charset=UTF-8","x-requested-with":"XMLHttpRequest"},"referrer":"http://www.gangwarsmobile.com/index.php?p=inventory","referrerPolicy":"no-referrer-when-downgrade","body":"pageaction=inventory&res_refresh=1&use=1&itemid=355139","method":"POST","mode":"cors"})
            .finally(() => {
                requestState = false;
                GetUserData();
            });
        }
    }
}

function UseLargeSkull(){
    if(activated == true){
        if(requestState == true){
            setTimeout(UseLargeSkull,250) // Attempt to use a large skull
        }else{
            log("Using Item: Large Skull...");
            requestState = true;
            fetch("http://www.gangwarsmobile.com/index.php", {"credentials":"include","headers":{"accept":"*/*","accept-language":"en-US,en;q=0.9","content-type":"application/x-www-form-urlencoded; charset=UTF-8","x-requested-with":"XMLHttpRequest"},"referrer":"http://www.gangwarsmobile.com/index.php?p=inventory","referrerPolicy":"no-referrer-when-downgrade","body":"pageaction=inventory&res_refresh=1&use=1&itemid="+LargeSkull,"method":"POST","mode":"cors"})
            .then(res => res.text())
            .then(body => StamGain = body.slice(45,48))
            .catch(err => console.error(err))
            .finally(() => {
            // ImportantValue = StamGain
            switch(StamGain){
                    case "+60":
                        break;
                    case '{"r':
                        requestState = false;
                        UseSmallSkull();
                        break;
                    default:
                    break;
            }
                requestState = false;
                GetUserData();
            });
        }
    }
}

function UseSmallSkull(){
    if(activated == true){
        if(requestState == true){
            setTimeout(UseSmallSkull,250) // Attempt to use a small skull
        }else{
            requestState = true;
            log("Using Item: Small Skull...");
            fetch("http://www.gangwarsmobile.com/index.php", {"credentials":"include","headers":{"accept":"*/*","accept-language":"en-US,en;q=0.9","content-type":"application/x-www-form-urlencoded; charset=UTF-8","x-requested-with":"XMLHttpRequest"},"referrer":"http://www.gangwarsmobile.com/index.php?p=inventory","referrerPolicy":"no-referrer-when-downgrade","body":"pageaction=inventory&res_refresh=1&use=1&itemid="+SmallSkull,"method":"POST","mode":"cors"})
            .then(res => res.text())
            .then(body => StamGain = body.slice(45,48))
            .catch(err => console.error(err))
            .finally(() => {
            switch(StamGain){
                    case "+30":
                        requestState = false;
                        break;
                    default:
                        requestState = false;
                        break;
            }
                GetUserData();
            });
        }
    }
}

function ForgeCollect(){
    if(activated == true){
        if(requestState == true){
            setTimeout(ForgeCollect,250)
        }else{
            log("Collecting from forges...");
            for(i=1;i<12;i++){
                fetch("http://www.gangwarsmobile.com/index.php", {"credentials":"include","headers":{"accept":"*/*","accept-language":"en-US,en;q=0.9","content-type":"application/x-www-form-urlencoded; charset=UTF-8","x-requested-with":"XMLHttpRequest"},"referrer":"http://www.gangwarsmobile.com/index.php?p=property","referrerPolicy":"no-referrer-when-downgrade","body":"pageaction=property&action=collect&room="+i,"method":"POST","mode":"cors"});
            }
            setDate('forge');
            requestState == false
        }
    }
}

function IndustryCollect(WhichCollection){
    if(activated == true){
        if(WhichCollection !== undefined){
            wc = WhichCollection;
        }
        if(requestState == true){
            setTimeout(IndustryCollect,250)
        }else{
            switch(wc){
                case true:
                log("Collecting Industries 16-18...");
                    for(i=16;i<19;i++){
                        fetch("http://www.gangwarsmobile.com/index.php", {"credentials":"include","headers":{"accept":"*/*","accept-language":"en-US,en;q=0.9","content-type":"application/x-www-form-urlencoded; charset=UTF-8","x-requested-with":"XMLHttpRequest"},"referrer":"http://www.gangwarsmobile.com/index.php?p=industry","referrerPolicy":"no-referrer-when-downgrade","body":"pageaction=industry&res_refresh=1&action=collect&id="+i,"method":"POST","mode":"cors"})
                        .finally(() =>{
                            setDate('industry2');
                            requestState = false;
                        });
                    }
                    break;
                case false:
                log("Collecting Industries 1-16...");
                        for(i=1;i<16;i++){
                            fetch("http://www.gangwarsmobile.com/index.php", {"credentials":"include","headers":{"accept":"*/*","accept-language":"en-US,en;q=0.9","content-type":"application/x-www-form-urlencoded; charset=UTF-8","x-requested-with":"XMLHttpRequest"},"referrer":"http://www.gangwarsmobile.com/index.php?p=industry","referrerPolicy":"no-referrer-when-downgrade","body":"pageaction=industry&res_refresh=1&action=collect&id="+i,"method":"POST","mode":"cors"})
                            .finally(() =>{
                                setDate('industry');
                                requestState = false;
                            });
                        }
                    break;
                default:   
            }
            requestState = false;
        }
    }
}

function CommitCrime(){
    if(activated == true){
        if(requestState == true){
            setTimeout(CommitCrime,250)
        }else{
            if(UserData["hp"] <= (UserData["max_hp"]-2200)){
                UseHealthKit();
                CommitCrime();
            }else{
                requestState = true;
                if(UserData["stamina"] > StaminaRequirement){
                    switch(ActionType){
                        case "crime":
                        log("Doing Crime...");
                            //Crime
                            fetch("http://www.gangwarsmobile.com/index.php", {"credentials":"include","headers":{"accept":"*/*","accept-language":"en-US,en;q=0.9","content-type":"application/x-www-form-urlencoded; charset=UTF-8","x-requested-with":"XMLHttpRequest"},"referrer":"http://www.gangwarsmobile.com/index.php?p=crimes","referrerPolicy":"no-referrer-when-downgrade","body":"commit=1&crime=26&pageaction=crimes","method":"POST","mode":"cors"})
                            .finally(() =>{
                                //console.log("Health: " + UserData["hp"] + "/" + UserData["max_hp"])
                                requestState = false;
                                GetUserData();
                                crimescount++;
                                CommitCrime();
                            });
                            break;

                        case "casino":
                        log("Playing Casino...");
                            //Casino
                            fetch("http://www.gangwarsmobile.com/index.php", {"credentials":"include","headers":{"accept":"*/*","accept-language":"en-US,en;q=0.9","content-type":"application/x-www-form-urlencoded; charset=UTF-8","x-requested-with":"XMLHttpRequest"},"referrer":"http://www.gangwarsmobile.com/index.php?p=casino","referrerPolicy":"no-referrer-when-downgrade","body":"pageaction=casino&game=6","method":"POST","mode":"cors"})
                            .finally(() =>{
                                //console.log("Health: " + UserData["hp"] + "/" + UserData["max_hp"])
                                requestState = false;
                                GetUserData();
                                crimescount++;
                                CommitCrime();
                            });
                            break;
                        case "beer":
                        log("Drinking Beer...");
                            //Beer
                            fetch("http://www.gangwarsmobile.com/index.php", {"credentials":"include","headers":{"accept":"*/*","accept-language":"en-US,en;q=0.9","content-type":"application/x-www-form-urlencoded; charset=UTF-8","x-requested-with":"XMLHttpRequest"},"referrer":"http://www.gangwarsmobile.com/index.php?p=inventory","referrerPolicy":"no-referrer-when-downgrade","body":"pageaction=inventory&res_refresh=1&use=1&itemid="+BeerID,"method":"POST","mode":"cors"})
                            .finally(() =>{
                                //console.log("Health: " + UserData["hp"] + "/" + UserData["max_hp"])
                                requestState = false;
                                GetUserData();
                                crimescount++;
                                CommitCrime();
                            });
                            break;
                    }
                    
                    
                }else{
                    requestState = false;
                    UseLargeSkull();
                    CommitCrime();
                }
            }
        }
    }
}

function ActivateBot(){
    CommitCrime();
}
