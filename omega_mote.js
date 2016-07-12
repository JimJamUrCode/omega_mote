var customgpio = require('./customgpio');
var http = require('http');
var fs = require("fs");
var path = require("path");
var exec = require('child_process').exec;

var buttonStates = {};
var buttonAddresses = {};
var config = {};
var remoteHost = "192.168.1.103";

var init = function()
{
  try
  {
    switchToMultiColor();
    
    loadConfigFile();
    
    setAllInputs(0, doneSettingAllInputs);
    
    function doneSettingAllInputs()
    {
      for(var i = 0; i < config.buttons.length; i++)
      {
        console.log("Creating pin: " + config.buttons[i].gpiopin);
        initpin(config.buttons[i].gpiopin, 'in');
        buttonStates[config.buttons[i].gpiopin] = "off";
        buttonAddresses[config.buttons[i].gpiopin] = config.buttons[i].postAddress;
      }
      
      for(var i = 0; i < config.buttons.length; i++)
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
    config = require(home + '/omega_gpio/config.json');
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
  for(var i = 0; i < config.buttons.length; i++)
  {
    var val = readinput(config.buttons[i].gpiopin);
    // console.log("Value: " + val);
    // console.log("buttonStates: " + JSON.stringify(buttonStates));
    
    if (val == 0)
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
        
        buttonStates[config.buttons[i].gpiopin] = "on";
        var address = buttonAddresses[config.buttons[i].gpiopin];
        console.log("Post address: " + address);
        postToAddress(address);
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
    
    callback(error, stdout, stderr);
  });
};

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



















var _exportpath = "/sys/class/gpio/gpiochip0/subsystem/export";
_unexportpath = "/sys/class/gpio/gpiochip0/subsystem/unexport";
var _gpiopath = "/sys/class/gpio/gpio";



var writetofs = function(fname, data)
{
  try
  {
    fs.writeFileSync(fname, data);
    console.log("The file was saved!");
  }
  catch(e)
  {
    console.log("Error writing to file: " + e);
    switchToRed();
  }
}

var readfromfs = function(fname)
{
  try
  {
    var contents = fs.readFileSync(fname, 'utf8');
    return contents;
  }
  catch(e)
  {
    console.log("Error reading from file: " + e);
    switchToRed();
    return "0";
  }
}

var initpin = function(pin, direction)
{
  writetofs(_exportpath, pin);
  writetofs(_gpiopath + pin + '/direction', direction);
}

var readinput = function(pin)
{
  rdval = readfromfs(_gpiopath + '' + pin + '/value');
  return rdval;
}

var closepin = function(pin)
{
  writetofs(_unexportpath, pin)
}

var setoutput = function(pin, value)
{
  if (value == 0)
    wrval = '0';
  else
    wrval = '1';
  writetofs(_gpiopath + pin + '/value', wrval);
}


process.on('SIGINT', function ()
{
  console.log("Cleaning up...");
  closePins();
  
  process.exit();
});

var closePins = function()
{
  for(var i = 0; i < config.buttons.length; i++)
  {
    console.log("Closing pin: " + config.buttons[i].gpiopin);
    closepin(config.buttons[i].gpiopin);
  }
}

init();