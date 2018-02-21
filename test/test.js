'use strict';

const expect = require('chai').expect;
const chat = require('../');

describe('#chat', function(){
	it('Should return true', function() {
		var result = chat({name:"podChat"});
		expect(result).to.equal(true);
	});
});