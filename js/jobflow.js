/**
 * Jobflow
 *
 * Jobflow is a javascript implementation to support front-end job schedule of web element.
 * <p>
 * This simple implementation includes JobContext class, Job class, Task class and Transition
 * task class to support d3js transition.
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
 * <b>Transition:</b>
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
        fRemoveTask: function (id) {
            var task = this.tasks[id];
            this.tasks[id] = undefined;
            delete this.tasks[id];
            return task;
        },
        fPrevious: function(job) {
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
            } else if (this.next ) {
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
        fInject: function(job) {
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
        fInit:function(id) {
            this.id = id;
            this.callbacks = [];
            return this;
        },
        fRun: function() {
            for(var callback in this.callbacks) {
                callback();
            }
            this.fNotifyParent('end');
            return this;
        },
        fAddCallBack: function(callback) {
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
        styles: null,
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
            this.styles = [];
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
        fTransformStyles: function (styleName, srcValue, targetValue) {
            if (targetValue) {
                this.styles.push({
                    'name': styleName,
                    'srcValue': srcValue,
                    'targetValue': targetValue
                });
            } else {
                if (typeof styleName === 'string') {
                    this.styles.push({
                        'name': styleName,
                        'targetValue': srcValue
                    });
                } else {
                    this.styles.push({
                        'srcValue': styleName,
                        'targetValue': srcValue
                    });
                }
            }
            return this;
        },
        fRun: function () {
            var _this = this,
                src = {},
                target = {},
                tweenStyles = [];
            if (this.d3Sel && this.styles.length > 0) {
                for (var i in this.styles) {
                    if (this.styles[i].name) {
                        if (!this.styles[i].srcValue && typeof this.styles[i].targetValue === 'function') {
                            // Will use tween function
                            tweenStyles.push(this.styles[i]);
                        } else {
                            if (this.styles[i].srcValue) {
                                src[this.styles[i].name] = this.styles[i].srcValue;
                            }
                            if (this.styles[i].targetValue) {
                                target[this.styles[i].name] = this.styles[i].targetValue;
                            }
                        }
                    } else {
                        src = this.styles[i].srcValue;
                        target = this.styles[i].targetValue;
                    }
                }

                var size = this.d3Sel.size(), count = 0;
                var trans = this.d3Sel;
                if (!d3.map(src).empty()) {
                    trans = trans.style(src);
                }
                trans = trans.transition()
                    .delay(this.delay)
                    .duration(this.duration)
                    .ease(this.ease);
                // Notify caller this selection has completed transition.
                trans.each('end', function () {
                    count++;
                    if (count === size) {
                        _this.fNotifyParent('end');
                    }
                });
                if (!d3.map(target).empty()) {
                    trans.style(target);
                }

                // Apply styles with smooth tween function.
                if (tweenStyles.length) {
                    for (var k in tweenStyles) {
                        trans = trans.styleTween(tweenStyles[k].name, tweenStyles[k].targetValue);
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