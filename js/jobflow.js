(function() {
	function JobContext() {

	}

	function Job() {
		return this.fInit.apply(this, arguments);
	}

	Job.prototype = {
		next: null,
		tasks: {},
		callCount: null,
		taskMap: null,
		fInit: function(context) {
			this.context = context;
			this.tasks = {};
			return this;
		},
		fAddTask: function(task) {
			this.tasks[task.id] = task;
			this.tasks[task.id].parentJob = this;
			this.tasks[task.id].context = this.context;
			return this;
		},
		fRemoveTask: function(id) {
			var task = this.tasks[id];
			this.tasks[id] = undefined;
			delete this.tasks[id];
			return task;
		},
		fNext: function(job) {
			if (job) {
				this.next = job;
				return this;
			} else {
				return this.next;
			}
		},
		fRun: function() {
			this.callCount = 0; // Reset call count.
			this.taskMap = d3.map(this.tasks);
			this.taskMap.forEach(function(k, task) {
				task.fRun();
			});
		},
		fOnTaskEnd: function(taskId, msgId) {
			if (msgId === 'end') {
				this.callCount++;
				if (this.callCount === this.taskMap.size()) {
					if (typeof this.next === 'function') {
						this.next();
					} else if (this.next instanceof Job) {
						this.next.fRun();
					}
				}
			}
		}
	};

	function Task() {
		return this.fInit.apply(this, arguments);
	}

	Task.prototype = {
		parentJob: null,
		context: null,
		fInit: function() {
			return this;
		},
		fRun: function() {

		},
		fNotifyParent: function(msgId) {
			this.parentJob && this.parentJob.fOnTaskEnd(this.id, msgId);
		}
	};

	function Transition() {
		return this.fInit.apply(this, arguments);
	}

	Transition.prototype = $.extend({}, new Task(), {
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

	var jobflow = {};
	jobflow.JobContext = JobContext;
	jobflow.Job = Job;
	jobflow.Task = Task;
	jobflow.Transition = Transition;
	window.jobflow = window.jobflow || jobflow;
})();