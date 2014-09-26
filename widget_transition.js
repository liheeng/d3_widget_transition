function transition() {
	return this.fInit.apply(this, arguments);	
}

transition.prototype = {
	selections: {},
	eachHandlers: {},
	selMap: null,
	next: null,
	fInit: function() {
		return this;
	},
	fSelection: function() {
		if(!arguments.length) {
			return this.selections;
		} else {
			this.selections[arguments[0].id] = arguments[0];
			this.selections[arguments[0].id].parent = this;
			return this;
		}
	},
	fCreateSelection: function(id, o) {
		this.selections[id] = new selection(id, o);
		this.selections[id].parent = this;
		return this.selections[id];
	},
	fNext: function(_transition) {
		if (!arguments.length) {
			return this.next;
		} else {
			this.next = _transition;
			return this;	
		}
	},	
	fRun: function() {
		this.selMap = d3.map(this.selections);
		this.selMap.forEach(function(k, v){
			v.fRun();
		});
	},
	fOnSelectionEnd: function(selId, msgId) {
		if (msgId === 'end') {
			this.selMap.remove(selId);
			if (this.selMap.empty() && this.next) {
				this.next.fRun();
			}
		}
	}
}

function selection() {
	return this.fInit.apply(this, arguments);
}

selection.prototype = {
	id: null,
	parent: null,
	d3Sel: null,
	styleActions: null,
	delay: 0,
	duration:750,
	ease: 'cubic-in-out',
	fInit: function(id, o) {
		this.id = id;
		this.d3Sel = d3.selectAll(o);
		this.styleActions = [];
		return this;
	},
	fDelay:function() {
		if (!arguments.length) {
			return this.delay;
		} else {
			this.delay = arguments[0];
			return this;
		}
	},
	fDuration: function() {
		if (!arguments.length) {
			return this.duration;
		} else {
			this.duration = arguments[0];
			return this;
		}
	},
	fEase: function() {
		if (!arguments.length) {
			return this.ease;
		} else {
			this.ease = arguments[0];
			return this;
		}
	},
	fStyleTransform: function(styleName, initValue, targetValue) {
		if (targetValue) {
			this.styleActions.push({'name': styleName, 'initValue': initValue, 'targetValue': targetValue});
		} else {
			this.styleActions.push({'initValue': styleName, 'targetValue': initValue});
		}
		return this;
	},
	fRun: function() {
		var src = {},target = {};
		for(var i in this.styleActions) {
			if (this.styleActions[i].name) {
				src[this.styleActions[i].name] = this.styleActions[i].initValue;
				target[this.styleActions[i].name] = this.styleActions[i].targetValue;	
			} else {
				src = this.styleActions[i].initValue;
				target = this.styleActions[i].targetValue;
			}
		}

		this.d3Sel.style(src)
		.transition()
		.delay(this.delay)
		.duration(this.duration)
		.ease(this.ease)
		.style(target)
		.each('end', function() {
			return _this.parent && _this.parent.fOnSelectionEnd(_this.id, 'end');
		});
	}
}