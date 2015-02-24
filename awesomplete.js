/**
 * Simple, lightweight, usable local autocomplete library for modern browsers
 * Because there werenât enough autocomplete scripts in the world? Because Iâm completely insane and have NIH syndrome? Probably both. :P
 * @author Lea Verou http://leaverou.github.io/awesomplete
 * MIT license
 */

(function ($, $$) {

var __nativeST__ = window.setTimeout, __nativeSI__ = window.setInterval;

window.setTimeout = function (vCallback, nDelay /*, argumentToPass1, ..., etc. */) {
    var oThis = this, aArgs = Array.prototype.slice.call(arguments, 2);
    return __nativeST__(vCallback instanceof Function ? function () {
        vCallback.apply(oThis, aArgs);
    } : vCallback, nDelay);
};

$.create = function(tag, o) {
	var element = document.createElement(tag);

	for (var i in o) {
		var val = o[i];

		if (i == "inside") {
			$(val).appendChild(element);
		}
        else if (i == "before") {
            $(val).insert({before: element});
        }
		else if (i == "around") {
			var ref = $(val);
			ref.parentNode.insertBefore(element, ref);
			element.appendChild(ref);
		}
		else if (i in element) {
			element[i] = val;
		}
		else {
			element.writeAttribute(i, val);
		}
	}

	return element;
};

$.bind = function(element, o) {
	if (element) {
		for (var event in o) {
			var callback = o[event];

			event.split(/\s+/).each(function (event) {
				element.observe(event, callback);
			});
		}
	}
};

$.fire = function(target, type) {
    Event.fire($(target), type);
};

var _ = self.Awesuggest = function (input, o) {
	var me = this;

    // Setup environment
    o = o || {};

    // Create elements
	this.hiddenInput = input = $(input);
    this.hiddenInput.hide().writeAttribute("hidden");

    this.container = $.create("div", {
        className: "awesomplete",
        around: input
    });

    this.selections = $.create("ul", {
        className: "selections",
        inside: this.container
    });

    this.inputWrapper = $.create("li", {
        className: "inputWrapper",
        inside: this.selections
    });

    this.input = $.create("input", {
        inside: this.inputWrapper
    });
    this.input.writeAttribute("aria-autocomplete", "list");

    this.selection = o.selection || function (text) {
        return $.create("li", {
            before: me.inputWrapper,
            innerHTML: "<a class=\"close\">&times;</a> " + text
        });
    };

    var prefilledValues = this.hiddenInput.getValue().split(", ");
    for (var i = 0; i < prefilledValues.length; i++) {
        this.selection(prefilledValues[i].trim());
    }

    this.suggestions = $.create("ul", {
        hidden: "",
        className: "suggestions",
        inside: this.container
    });


	this.minChars = +input.readAttribute("data-minchars") || o.minChars || 1;
	this.maxItems = +input.readAttribute("data-maxitems") || o.maxItems || false;

    function setList(list) {
        if (Object.isArray(list)) {
            me._list = list;
        }
        else {
            if (typeof list == "string" && list.indexOf(",") > -1) {
                me._list = list.split(/\s*,\s*/);
            }
            else {
                list = $(list);

                if (list && list.children) {
                    me._list = [].slice.apply(list.children).map(function (el) {
                        return el.innerHTML.trim();
                    });
                }
            }
        }
    }

	if (input.hasAttribute("list")) {
		this.list = "#" + input.readAttribute("list");
		input.removeAttribute("list");
	}
	else {
		this.list = input.readAttribute("data-list") || o.list || [];
	}
    setList(this.list);

	this.filter = o.filter || _.FILTER_CONTAINS;

	this.autoFirst = input.hasAttribute("data-autofirst") || o.autoFirst || false;

    this.suggestion = o.suggestion || function (text, input) {
		return $.create("li", {
			innerHTML: text.replace(RegExp(regEscape(input.trim()), "gi"), "<em>$&</em>"),
			"aria-selected": "false"
		});
	};

	this.index = -1;

    // Bind events

	$.bind(this.input, {
		"input": function () {
			me.evaluate();
		},
		"blur": function () {
			me.close();
		},
		"keydown": function(evt) {
			var c = evt.keyCode;

			if (c ==  9 || c == 13 || c == 188) { // Tab, Enter, Comma
                evt.preventDefault();
                if (me.index > -1) {
                    me.select();
                } else if (me.input.getValue !== "") {
                    me.add();
                }
			}
            else if (c == 8 && me.input.value === "") { // Backspace
                me.removeLast();
            }
			else if (c == 27) { // Esc
				me.close();
			}
			else if (c == 38 || c == 40) { // Down/Up arrow
				evt.preventDefault();
				me[c == 38? "previous" : "next"]();
			}
            else {
                window.setTimeout.call(me, me.evaluate, 400);
            }
		}
	});

	$.bind(this.input.form, {"submit": function(event) {
		me.close();
	}});

	$.bind(this.suggestions, { "mousedown": function(evt) {
        var li = evt.target;

        if (li != this) {

            while (li && !/li/i.test(li.nodeName)) {
                li = li.parentNode;
            }

            if (li) {
                me.select(li);
            }
        }
    }});

    $.bind(this.selections, {"click": function (evt) {
        var btn = evt.findElement('a.close');
        if (btn) {
            var parent = btn.up("li"),
                text = parent.innerText.slice(2),
                valArray = me.hiddenInput.getValue().split(", "),
                idx = valArray.indexOf(text);

            valArray.splice(idx, 1);
            me.hiddenInput.setValue(valArray.join(", "));
            console.log(me.hiddenInput.getValue());

            parent.remove();
        } else {
            me.input.focus();
        }
    }});
};

_.prototype.close = function () {
    this.suggestions.hide().writeAttribute("hidden", "");
    this.index = -1;

    $.fire(this.input, "awesomplete-close");
};

_.prototype.open = function () {
    this.suggestions.show().removeAttribute("hidden");

    if (this.autoFirst && this.index == -1) {
        this.goto(0);
    }

    $.fire(this.input, "awesomplete-open");
};

_.prototype.next = function () {
    var count = this.suggestions.children.length;

    this.goto(this.index < count - 1? this.index + 1 : -1);
};

_.prototype.previous = function () {
    var count = this.suggestions.children.length;

    this.goto(this.index > -1? this.index - 1 : count - 1);
};

// Should not be used, highlights specific item without any checks!
_.prototype.goto = function (i) {
    var lis = this.suggestions.children;

    if (this.index > -1) {
        lis[this.index].writeAttribute("aria-selected", "false");
    }

    this.index = i;

    if (i > -1 && lis.length > 0) {
        lis[i].writeAttribute("aria-selected", "true");
    }
};

_.prototype.select = function (selected) {
    selected = selected || this.suggestions.children[this.index];

    if (selected) {
        var prevented;

        $.fire(this.input, "awesomplete-select", {
            text: selected.textContent,
            preventDefault: function () {
                prevented = true;
            }
        });

        if (!prevented) {
            this.selection(selected.innerText);

            var valArray = this.hiddenInput.getValue().split(", ");
            valArray.push(selected.innerText);

            this.hiddenInput.setValue(valArray.join(", "));
            this.input.setValue("");

            console.log("Before close");
            this.close();
            console.log("After close");
            $.fire(this.input, "awesomplete-selectcomplete");
        }
    }
};

_.prototype.add = function() {
    var value = this.input.value,
        valArray = this.hiddenInput.getValue().split(", ");

    // Strip HTML tags, commas, quotation marks and newlines
    value = value.replace(/(<([^>]+)>|,|"|\r\n|\n|\r)/ig, "");

    valArray.push(value);
    this.hiddenInput.setValue(valArray.join(", "));

    this.selection(value);
    this.input.setValue("");

    this.close();
    $.fire(this.input, "awesomplete-addcomplete");

    this.input.focus();
};

_.prototype.removeLast = function() {
    var valArray = this.hiddenInput.getValue().split(", ");

    valArray.pop();
    this.hiddenInput.setValue(valArray.join(", "));
    this.inputWrapper.previous("li").remove();

    this.close();
    $.fire(this.input, "awesomplete-removecomplete");
};

_.prototype.evaluate = function() {
    var value = this.input.getValue(),
        selectedValues = this.hiddenInput.getValue().split(", ");

    if (value.length >= this.minChars && this._list.length > 0) {
        this.index = -1;
        // Populate list with options that match
        this.suggestions.innerHTML = "";

        for (var i = 0; i < this._list.length; i++) {
            var candidate = this._list[i];

            if (this.filter(candidate, value) && selectedValues.indexOf(candidate) == -1) {
                this.suggestions.appendChild(this.suggestion(candidate, value));

                if (this.maxItems &&
                    this.suggestions.childElements("li").length == this.maxItems) {
                    break;
                }
            }
        }

        this.open();
    }
    else {
        this.close();
    }
};

_.FILTER_CONTAINS = function (text, input) {
	return RegExp(regEscape(input.trim()), "i").test(text);
};

_.FILTER_STARTSWITH = function (text, input) {
	return RegExp("^" + regEscape(input.trim()), "i").test(text);
};

function regEscape(s) { return s.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&"); }

function init() {
	$$("input.awesomplete").each(function (input) {
		new Awesuggest(input);
	});
}

// DOM already loaded?
if (document.readyState !== "loading") {
	init();
} else {
	// Wait for it
	document.observe("DOMContentLoaded", init);
}

_.$ = $;
_.$$ = $$;

})($, $$);
