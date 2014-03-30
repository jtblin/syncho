var chai = require("chai");
global.chai = chai;
global.should = chai.should();
global.expect = chai.expect;
var sinonChai = require("sinon-chai");
chai.use(sinonChai);