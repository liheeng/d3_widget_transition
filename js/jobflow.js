/**
 * Jobflow
 *
 * Jobflow is a javascript implementation to support front-end job schedule of web element.
 * <p>
 * This simple implementation includes JobContext class, Job class, Task class , CreationTask and TransitionTask
 * class to support d3js transition.
 * <p>
 * <b>JobContext:</b>
 *      The JobContext class stores job context information to be used by job and task.
 * <b>Job:</b>
 *      The Job class can contain multiple tasks and specify the next job. <br>
 * All tasks in a job will be executed concurrently as expected, and after all tasks<br>
 * are end, the next job will be called if it exists.
 * <b>Task:</b>
 *      The Task class is a abstract class and defines fRun and fNotifyParent functions, <br>
 * this class should be implemented to support different case and require.
 * <b>CreationTask:</b>
 *      This creation class is used to define element creation.
 * <b>TransitionTask:</b>
 *      The Transition class is an implementation of Task to support d3js transition functions.
 * <p>
 * Examples:
 * ../examples/jobflow.html
 * ../examples/jobflow-1.html
 *
 * @version: 0.1
 * @dependency: jquery and d3js
 * @license: MIT
 * @author: Heng Li
 *
 * @changes:
 *    2014-09-30: Refactor code and added docs.
 *    2014-09-24: Initial creation.
 */
(function () {
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
        fInit: function (context) {
            this.context = context;
            this.tasks = {};
            return this;
        },
        fAddTask: function (task) {
            this.tasks[task.id] = task;
            this.tasks[task.id].parentJob = this;
            this.tasks[task.id].context = this.context;
            return this;
        },
        fCreateTask: function (taskClass, args) {
            var task = taskClass.apply(new taskClass(), args);
            this.fAddTask(task);
            return task;
        },
        fRemoveTask: function (id) {
            var task = this.tasks[id];
            this.tasks[id] = undefined;
            delete this.tasks[id];
            return task;
        },
        fPrevious: function (job) {
            if (job) {
                job.next = this;
            }
            return this;
        },
        fNext: function (job) {
            if (job) {
                this.next = job;
                return this;
            } else {
                return this.next;
            }
        },
        fRun: function () {
            this.callCount = 0; // Reset call count.
            this.taskMap = d3.map(this.tasks);
            if (this.taskMap.size() > 0) {
                this.taskMap.forEach(function (k, task) {
                    task.fRun();
                });
            } else if (this.next) {
                this.fOnTaskEnd(this.id, 'end');
            }
        },
        fOnTaskEnd: function (taskId, msgId) {
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
        fInit: function () {
            return this;
        },
        fInject: function (job) {
            job.fAddTask(this);
            return this;
        },
        fRun: function () {
            return this;
        },
        fNotifyParent: function (msgId) {
            this.parentJob && this.parentJob.fOnTaskEnd(this.id, msgId);
            return this;
        }
    };

    function CreationTask() {
        return this.fInit.apply(this, arguments);
    }

    CreationTask.prototype = $.extend({}, new Task(), {
        callbacks: null,
        fInit: function (id) {
            this.id = id;
            this.callbacks = [];
            return this;
        },
        fRun: function () {
            for (var callback in this.callbacks) {
                callback();
            }
            this.fNotifyParent('end');
            return this;
        },
        fAddCallBack: function (callback) {
            this.callbacks.push(callback);
            return this;
        }
    });

    function TransitionTask() {
        return this.fInit.apply(this, arguments);
    }

    TransitionTask.prototype = $.extend({}, new Task(), {
        id: null,
        d3Sel: null,
        attrs: null,
        styles: null,
        tweens: null,
        transStyles: null,
        transAttrs: null,
        srcText: undefined,
        targetText: undefined,
        delay: 0,
        duration: 750,
        ease: 'cubic-in-out',
        /**
         *
         * @param id identify of this task
         * @param container element id or element class name or element tag name or d3 selection object.
         * @returns {TransitionTask}
         */
        fInit: function (id, container) {
            this.id = id;
            this.d3Sel = (typeof container === 'string') ? d3.selectAll(container) : container;
            this.attrs = [];
            this.styles = [];
            this.tweens =[];
            this.transStyles = [];
            this.transAttrs = [];
            this.srcText = undefined;
            this.targetText = undefined;
            return this;
        },
        fDelay: function () {
            if (!arguments.length) {
                return this.delay;
            } else {
                this.delay = arguments[0];
                return this;
            }
        },
        fDuration: function () {
            if (!arguments.length) {
                return this.duration;
            } else {
                this.duration = arguments[0];
                return this;
            }
        },
        fEase: function () {
            if (!arguments.length) {
                return this.ease;
            } else {
                this.ease = arguments[0];
                return this;
            }
        },
        fAttr: function() {
            this.attrs.push([].slice.call(arguments));
            return this;
        },
        fStyle: function() {
            this.styles.push([].slice.call(arguments));
            return this;
        },
        fText: function(text) {
            if (!arguments.length) {
                return this.srcText;
            } else {
                this.srcText = text + '';
                return this;
            }
        },
        fTween: function(name, tweenFunc) {
            this.tweens.push([].slice.call(arguments));
            return this;
        },
        fTransformAttr: function (attrName, srcAttr, targetAttr) {
            if (targetAttr) {
                this.transAttrs.push({
                    'name': attrName,
                    "srcAttr": srcAttr,
                    'targetAttr': targetAttr
                });
            } else {
                if (typeof attrName === 'string') {
                    this.transAttrs.push({
                        'name': attrName,
                        'targetAttr': srcAttr
                    });
                } else {
                    this.transAttrs.push({
                        'srcAttr': attrName,
                        'targetAttr': srcAttr
                    });
                }
            }
            return this;
        },
        fTransformStyle: function (styleName, srcStyle, targetStyle) {
            if (targetStyle) {
                this.transStyles.push({
                    'name': styleName,
                    "srcStyle": srcStyle,
                    "targetStyle": targetStyle
                });
            } else {
                if (typeof styleName === 'string') {
                    this.transStyles.push({
                        'name': styleName,
                        "targetStyle": srcStyle
                    });
                } else {
                    this.transStyles.push({
                        "srcStyle": styleName,
                        "targetStyle": srcStyle
                    });
                }
            }
            return this;
        },
        fTransformText: function (srcText, targetText) {
            this.srcText = targetText ? srcText : undefined;
            this.targetText = targetText ? targetText : srcText;
            return this;
        },
        fRun: function () {
            var _this = this,
                srcStyle = {},
                targetStyle = {},
                tweenStyles = [],
                srcAttr = {},
                targetAttr = {},
                tweenAttrs = [];

            if (this.d3Sel && (this.transStyles.length > 0 || this.transAttrs.length > 0 || this.srcText || this.targetText)) {
                for (var i in this.transStyles) {
                    if (this.transStyles[i].name) {
                        if (!this.transStyles[i].srcStyle && typeof this.transStyles[i].targetStyle === 'function') {
                            // Will use tween function
                            tweenStyles.push(this.transStyles[i]);
                        } else {
                            if (this.transStyles[i].srcStyle) {
                                srcStyle[this.transStyles[i].name] = this.transStyles[i].srcStyle;
                            }
                            if (this.transStyles[i].targetStyle) {
                                targetStyle[this.transStyles[i].name] = this.transStyles[i].targetStyle;
                            }
                        }
                    } else {
                        srcStyle = this.transStyles[i].srcStyle;
                        targetStyle = this.transStyles[i].targetStyle;
                    }
                }

                for (var i in this.transAttrs) {
                    if (this.transAttrs[i].name) {
                        if (!this.transAttrs[i].srcAttr && typeof this.transAttrs[i].targetAttr === 'function') {
                            // Will use tween function
                            tweenStyles.push(this.transAttrs[i]);
                        } else {
                            if (this.transAttrs[i].srcAttr) {
                                srcStyle[this.transAttrs[i].name] = this.transAttrs[i].srcAttr;
                            }
                            if (this.transAttrs[i].targetAttr) {
                                targetStyle[this.transAttrs[i].name] = this.transAttrs[i].targetAttr;
                            }
                        }
                    } else {
                        srcStyle = this.transStyles[i].srcAttr;
                        targetStyle = this.transStyles[i].targetAttr;
                    }
                }

                var size = this.d3Sel.size(), count = 0;
                var trans = this.d3Sel;
                if (!d3.map(srcAttr).empty()) {
                    trans = trans.attr(srcAttr);
                }
                if (!d3.map(srcStyle).empty()) {
                    trans = trans.style(srcStyle);
                }
                if (this.srcText !== undefined) {
                    trans = trans.text(this.srcText);
                }
                for(var k in this.attrs) {
                    trans.attr.apply(trans, this.attrs[k]);
                }
                for(k in this.styles) {
                    trans.style.apply(trans, this.styles[k]);
                }

                trans = trans.transition()
                    .delay(this.delay)
                    .duration(this.duration)
                    .ease(this.ease)
                    .each('end', function () {
                        // Notify caller this selection has completed transition.
                        count++;
                        if (count === size) {
                            _this.fNotifyParent('end');
                        }
                    });


                for(k in this.tweens) {
                    trans.tween.apply(trans, this.tweens[k]);
                }

                if (this.targetText !== undefined) {
                    trans = trans.text(this.targetText);
                }
                if (!d3.map(targetAttr).empty()) {
                    trans.attr(targetAttr);
                }
                if (!d3.map(targetStyle).empty()) {
                    trans.style(targetStyle);
                }

                // Apply attributes and styles with smooth tween function.
                if (tweenAttrs.length) {
                    for (var k in tweenAttrs) {
                        trans = trans.attrTween(tweenAttrs[k].name, tweenAttrs[k].targetAttr);
                    }
                }
                if (tweenStyles.length) {
                    for (var k in tweenStyles) {
                        trans = trans.styleTween(tweenStyles[k].name, tweenStyles[k].targetStyle);
                    }
                }

            } else {
                _this.fNotifyParent('end');
            }

            return this;
        }
    });

    var jobflow = {};
    jobflow.JobContext = JobContext;
    jobflow.Job = Job;
    jobflow.Task = Task;
    jobflow.CreationTask = CreationTask;
    jobflow.TransitionTask = TransitionTask;

    window.jobflow = window.jobflow || jobflow;
})();