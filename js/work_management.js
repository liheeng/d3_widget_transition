(function() {
	function WorkContext() {

	}

	function Work() {
		return this.fInit.apply(this, arguments);
	}

	Work.prototype = {
		next: null,
		jobs: {},
		callCount: null,
		jobMap: null,
		fInit: function(context) {
			this.context = context;
			this.jobs = {};
			return this;
		},
		fAddJob: function(job) {
			this.jobs[job.id] = job;
			this.jobs[job.id].parentWork = this;
			this.jobs[job.id].context = this.context;
			return this;
		},
		fRemoveJob: function(id) {
			var job = this.jobs[id];
			this.jobs[id] = undefined;
			delete this.jobs[id];
			return job;
		},
		fNext: function(work) {
			if (work) {
				this.next = work;
				return this;
			} else {
				return this.next;
			}
		},
		fRun: function() {
			this.callCount = 0; // Reset call count.
			this.jobMap = d3.map(this.jobs);
			this.jobMap.forEach(function(k, job) {
				job.fRun();
			});
		},
		fOnJobEnd: function(jobId, msgId) {
			if (msgId === 'end') {
				this.callCount++;
				if (this.callCount === this.jobMap.size()) {
					if (typeof this.next === 'function') {
						this.next();
					} else if (this.next instanceof Work) {
						this.next.fRun();
					}
				}
			}
		}
	}

	function Job() {
		return this.fInit.apply(this, arguments);
	}

	Job.prototype = {
		parentWork: null,
		context: null,
		fInit: function() {
			return this;
		},
		fRun: function() {

		},
		fNotifyParent: function(msgId) {
			this.parentWork && this.parentWork.fOnJobEnd(this.id, msgId);
		}
	}

	function Transition() {
		return this.fInit.apply(this, arguments);
	}

	Transition.prototype = $.extend({}, new Job(), {
		id: null,
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
				target = {},
				tweenStyles = [];
			for (var i in this.styles) {
				if (this.styles[i].name) {
					if (!this.styles[i].initValue && typeof this.styles[i].targetValue === 'function') {
						// Will use tween function
						tweenStyles.push(this.styles[i]);
					} else {
						src[this.styles[i].name] = this.styles[i].initValue || {};
						target[this.styles[i].name] = this.styles[i].targetValue || {};
					}
				} else {
					src = this.styles[i].initValue || {};
					target = this.styles[i].targetValue || {};
				}
			}

			var trans = this.d3Sel.style(src)
				.transition()
				.delay(this.delay)
				.duration(this.duration)
				.ease(this.ease)
				.style(target);

			// Apply styles with smooth tween function.
			if (tweenStyles.length) {
				for (var k in tweenStyles) {
					trans = trans.styleTween(tweenStyles[k].name, tweenStyles[k].targetValue);
				}
			}

			// Notify caller this selection has completed transition.
			trans.each('end', function() {
				_this.fNotifyParent('end');
			});
		}
	});

	var wm = {};
	wm.WorkContext = WorkContext;
	wm.Work = Work;
	wm.Job = Job;
	wm.Transition = Transition;
	window.wm = window.wm || wm;
})()