var http = require('http');
var exec = require('child_process').exec;
var customGPIO = require('./customGPIO');

var buttonStates = {};
var buttonAddresses = {};
var config = {};
var remoteHost = "192.168.1.103";
var value = 0;
var buttonsLength = 0;
var lastFreeMemCheck = 0;

var myGPIO = new customGPIO();

var init = function()
{
  try
  {
    lastFreeMemCheck = Date.now();
    
    switchToMultiColor();
    
    loadConfigFile();
    
    setAllInputs(0, doneSettingAllInputs);
    
    buttonsLength = config.buttons.length;
    function doneSettingAllInputs()
    {
      for(var i = 0; i < buttonsLength; i++)
      {
        console.log("Creating pin: " + config.buttons[i].gpiopin);
        myGPIO.initpin(config.buttons[i].gpiopin, 'in');
       
        //Keeping track of button states and addresses to those buttons
        buttonStates[config.buttons[i].gpiopin] = "off";
        buttonAddresses[config.buttons[i].gpiopin] = config.buttons[i].postAddress;
      }
      
      for(var i = 0; i < buttonsLength; i++)
      {
        command = "fast-gpio set " + config.buttons[i].gpiopin + " 0"
        console.log(command);
        execute(command, function(error, stdout, stderr){
          console.log("Done setting pin");
        });
      }
    
      switchToGreen();
    
      setImmediate(checkButton);
    }
  }
  catch(e)
  {
    console.log("Error on init: " + e);
    switchToRed();
    process.exit();
  }
}

var loadConfigFile = function()
{
  try
  {
    var home = process.env.HOME;
    config = require(home + '/omega_mote/config.json');
  }
  catch (e)
  {
    console.log('DEBUG:', e);
    console.log('WARNING: Cannot find config.json!');
    switchToRed();
    closePins();
    process.exit();
  }
}

var setAllInputs = function(pinIdx, callback)
{
  //Using fast-gpio to set pins the way we need
  var command = "fast-gpio set-input " + config.buttons[pinIdx].gpiopin;
  console.log("Setting pin " + config.buttons[pinIdx].gpiopin + " to an input.");
  execute(command, function(error, stdout, stderr){
    pinIdx++;
    
    if(pinIdx >= config.buttons.length)
      callback();
    else
      setAllInputs(pinIdx, callback);
  });
}

var checkButton = function()
{
  //readFreeMem();
  
  for(var i = 0; i < buttonsLength; i++)
  {
    value = myGPIO.readinput(config.buttons[i].gpiopin);
    // console.log("Value: " + value);
    // console.log("buttonStates: " + JSON.stringify(buttonStates));
    
    if (value == 0)
    {
      if (buttonStates[config.buttons[i].gpiopin] == "on")
      {
        console.log( "Pin " + config.buttons[i].gpiopin + " released");
        buttonStates[config.buttons[i].gpiopin] = "off";
      }
    }
    else
    {
      if(buttonStates[config.buttons[i].gpiopin] == "off")
      {
        console.log("Pin " + config.buttons[i].gpiopin + " pressed");
        switchToBlue();
        
        console.log("Changing Button State...");
        buttonStates[config.buttons[i].gpiopin] = "on";
        
        console.log("Post address: " + buttonAddresses[config.buttons[i].gpiopin]);
        postToAddress(buttonAddresses[config.buttons[i].gpiopin]);
      }
    }
  }
  setImmediate(checkButton);
}

var postToAddress = function(address){
  // Build the post string from an object
  try
  {
    var post_data = "";
    // An object of options to indicate where to post to
    var post_options = {
        host: remoteHost,
        port: '3000',
        path: address,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(post_data)
        }
    };

    // Set up the request
    var post_req = http.request(post_options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('Response: ' + chunk);
        });
    });

    post_req.end();
  }
  catch(e){
    console.log("postToAddress error occured: " + e);
    switchToRed();
  }
}

var execute = function(command, callback)
{
  exec(command, function(error, stdout, stderr)
  {
    if(error)
      console.log(JSON.stringify(error));
    if(stdout)
      console.log(JSON.stringify(stdout));
    if(stderr)
      console.log(JSON.stringify(stderr));
    
    if(callback != null && callback != undefined)
      callback(error, stdout, stderr);
  });
};

var readFreeMem = function()
{
  if(Date.now() - lastFreeMemCheck > 2000)
  {
    lastFreeMemCheck = Date.now();
    execute("free -m");
  }
}

var switchToBlue = function()
{
  exec("fast-gpio set 15 0");
  exec("fast-gpio set 16 1");
  exec("fast-gpio set 17 1");
  
  setTimeout(function()
  {
    switchToGreen();
  }, 250);
}

var switchToGreen = function()
{
  exec("fast-gpio set 15 1");
  exec("fast-gpio set 16 0");
  exec("fast-gpio set 17 1");
}

var switchToRed = function()
{
  exec("fast-gpio set 15 1");
  exec("fast-gpio set 16 1");
  exec("fast-gpio set 17 0");
}

var switchToMultiColor = function()
{
  exec("fast-gpio set 15 0");
  exec("fast-gpio set 16 0");
  exec("fast-gpio set 17 0");
}






















//Exit and clean up functions

process.on('SIGINT', function ()
{
  console.log("Cleaning up...");
  closePins();
  
  process.exit();
});

var closePins = function()
{
  for(var i = 0; i < buttonsLength; i++)
  {
    console.log("Closing pin: " + config.buttons[i].gpiopin);
    myGPIO.closepin(config.buttons[i].gpiopin);
  }
}

init();