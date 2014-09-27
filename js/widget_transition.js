(function() {
	var transitionCount = 0;

	function transition() {
		return this.fInit.apply(this, arguments);
	}

	transition.prototype = {
		selections: null,
		selMap: null,
		callCount: 0,
		next: null,

		fInit: function() {
			this.selections = {};
			return this;
		},
		fSelection: function() {
			if (!arguments.length) {
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
			this.callCount = 0; // Reset call count.
			this.selMap = d3.map(this.selections);
			this.selMap.forEach(function(k, v) {
				v.fRun();
			});
		},
		fOnSelectionEnd: function(selId, msgId) {
			if (msgId === 'end') {
				this.callCount++;
				if (this.callCount === this.selMap.size()) {
					if (typeof this.next === 'function') {
						this.next();
					} else if (this.next instanceof transition) {
						this.next.fRun();
					}
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
		styles: null,
		delay: 0,
		duration: 750,
		ease: 'cubic-in-out',
		fInit: function(id, o) {
			this.id = id;
			this.d3Sel = d3.selectAll(o);
			this.styles = [];
			return this;
		},
		fDelay: function() {
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
		fTransformStyles: function(styleName, initValue, targetValue) {
			if (targetValue) {
				this.styles.push({
					'name': styleName,
					'initValue': initValue,
					'targetValue': targetValue
				});
			} else {
				if (typeof styleName === 'string') {
					this.styles.push({
						'name': styleName,
						'targetValue': initValue
					});
				} else {
					this.styles.push({
						'initValue': styleName,
						'targetValue': initValue
					});
				}
			}
			return this;
		},
		fRun: function() {
			var _this = this,
				src = {},
				target = {};
			for (var i in this.styles) {
				if (this.styles[i].name) {
					src[this.styles[i].name] = this.styles[i].initValue || {};
					target[this.styles[i].name] = this.styles[i].targetValue || {};
				} else {
					src = this.styles[i].initValue || {};
					target = this.styles[i].targetValue || {};
				}
			}

			this.d3Sel.style(src)
				.transition()
				.delay(this.delay)
				.duration(this.duration)
				.ease(this.ease)
				.style(target)
				.each('end', function() {
					_this.parent && _this.parent.fOnSelectionEnd(_this.id, 'end');
				});
		}
	}

	var wt = {};
	wt.transition = transition;
	wt.selection = selection;
	window.wt = wt;
})();