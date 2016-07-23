var method = customGPIO.prototype;
var fs = require("fs");
var path = require("path");

function customGPIO() {
  this._exportpath = "/sys/class/gpio/gpiochip0/subsystem/export";
  this._unexportpath = "/sys/class/gpio/gpiochip0/subsystem/unexport";
  this._gpiopath = "/sys/class/gpio/gpio";
}

customGPIO.prototype.writetofs = function(fname, data)
{
  try
  {
    fs.writeFileSync(fname, data);
    console.log("The file was saved!");
  }
  catch(e)
  {
    console.log("Error writing to file: " + e);
  }
};

customGPIO.prototype.readfromfs = function(fname)
{
  try
  {
    var contents = fs.readFileSync(fname, 'utf8');
    return contents;
  }
  catch(e)
  {
    console.log("Error reading from file: " + e);
    return "0";
  }
};

customGPIO.prototype.initpin = function(pin, direction, callback)
{
  console.log("Exporting Pin.");
  this.writetofs(this._exportpath, pin);
  
  console.log("Setting direction of pin.");
  this.writetofs(this._gpiopath + pin + '/direction', direction);
};

customGPIO.prototype.readinput = function(pin)
{
  rdval = this.readfromfs(this._gpiopath + '' + pin + '/value');
  return rdval;
};

customGPIO.prototype.closepin = function(pin)
{
  this.writetofs(this._unexportpath, pin)
};

customGPIO.prototype.setoutput = function(pin, value)
{
  if (value == 0)
    wrval = '0';
  else
    wrval = '1';
  this.writetofs(this._gpiopath + pin + '/value', wrval);
};

module.exports = customGPIO;