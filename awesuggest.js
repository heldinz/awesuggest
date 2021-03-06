/**
 * AutoSuggest plugin for Prototype, supporting older browsers and multiple
 * keywords.
 * Munge of Lea Verou's Awesomplete (http://leaverou.github.io/awesomplete)
 * with Drew Wilson's jQuery AutoSuggest plugin.
 * @author Alice Rose http://heldinz.github.io/awesuggest
 * MIT license
 */

(function ($, $$) {

    /**
     * Replace native setTimeout with a non-native function that allows it to be
     * invoked with `call`. Fixes issues with `this`.
     * https://developer.mozilla.org/en-US/docs/Web/API/WindowTimers/setTimeout#A_possible_solution
     */
    var __nativeST__ = window.setTimeout, __nativeSI__ = window.setInterval;

    window.setTimeout = function (vCallback, nDelay /*, argToPass1, ..., etc. */) {
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

                    if (list && list.childElements()) {
                        me._list = [].slice.apply(list.childElements());
                        for (var i=0; i<me._list.length; i++) {
                            me._list[i] = me._list[i].innerHTML;
                        }
                    }
                }
            }
        }

        // Setup environment
        o = o || {};

        // Create elements
        this.hiddenInput = input = $(input);
        this.hiddenInput.hide().writeAttribute("hidden");

        this.container = $.create("div", {
            className: "awesuggest",
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

        var prefilledVals = getValsAsArray($F(this.hiddenInput));
        for (var i = 0; i < prefilledVals.length; i++) {
            this.selection(prefilledVals[i]);
        }

        this.suggestions = $.create("ul", {
            hidden: "",
            className: "suggestions",
            inside: this.container
        });

        this.minChars = +input.readAttribute("data-minchars") || o.minChars || 1;
        this.maxItems = +input.readAttribute("data-maxitems") || o.maxItems || false;

        if (input.hasAttribute("list")) {
            this.list = input.readAttribute("list");
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
                    }
                    else if (me.input.getValue() !== "") {
                        me.add();
                    }
                }
                else if (c == 8 && me.input.getValue() === "") { // Backspace
                    evt.preventDefault();
                    var selected = me.selections.select("li[aria-selected=true]"),
                        last = me.inputWrapper.previous();
                    if (selected.length > 0) {
                        me.removeSelected();
                    }
                    else if (last != null) {
                        last.writeAttribute("aria-selected", "true");
                    }
                }
                else if (c == 27) { // Esc
                    me.close();
                }
                else if (c == 38 || c == 40) { // Down/Up arrow
                    evt.preventDefault();
                    me[c == 38? "previous" : "next"]();
                }
                else {
                    me.deselectSelection();
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
            var btn = evt.findElement('a.close'),
                li = evt.findElement('li');
            if (btn) {
                var parent = btn.up("li"),
                    text = getTextContent(parent).slice(2),
                    valArray = getValsAsArray($F(me.hiddenInput)),
                    idx = valArray.indexOf(text);

                valArray.splice(idx, 1);
                me.hiddenInput.setValue(valArray.join(", "));

                parent.remove();
            }
            else if (li && li.readAttribute("aria-selected") === "true") {
                li.writeAttribute("aria-selected", "false");
            }
            else if (li) {
                me.selections.childElements().each(function(item) {
                    item.writeAttribute("aria-selected", "false");
                });
                li.writeAttribute("aria-selected", "true").focus();
            }
            else {
                me.input.focus();
            }
        }});
    };

    _.prototype.close = function () {
        this.suggestions.hide().writeAttribute("hidden", "");
        this.index = -1;

        $.fire(this.input, "awesuggest-close");
    };

    _.prototype.open = function () {
        this.suggestions.show().removeAttribute("hidden");

        if (this.autoFirst && this.index == -1) {
            this.goto(0);
        }

        $.fire(this.input, "awesuggest-open");
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

            $.fire(this.input, "awesuggest-select", {
                text: getTextContent(selected),
                preventDefault: function () {
                    prevented = true;
                }
            });

            if (!prevented) {
                this.selection(getTextContent(selected));

                var valArray = getValsAsArray($F(this.hiddenInput));
                valArray.push(getTextContent(selected));

                this.hiddenInput.setValue(valArray.join(", "));
                this.input.setValue("");

                this.close();
                $.fire(this.input, "awesuggest-selectcomplete");
            }
        }
    };

    _.prototype.add = function() {
        var value = this.input.value,
            valArray = getValsAsArray($F(this.hiddenInput));

        // Strip HTML tags, commas, quotation marks and newlines
        value = value.replace(/(<([^>]+)>|,|"|\r\n|\n|\r)/ig, "");

        if (value !== "") {
            valArray.push(value);
            this.hiddenInput.setValue(valArray.join(", "));

            this.selection(value);
            $.fire(this.input, "awesuggest-addcomplete");
        }

        this.close();
        this.input.setValue("");
        this.input.focus();
    };

    _.prototype.removeSelected = function() {
        var selected = this.selections.select("li[aria-selected=true]").first(),
            text = getTextContent(selected).slice(2),
            valArray = getValsAsArray($F(this.hiddenInput)),
            idx = valArray.indexOf(text);

        valArray.splice(idx, 1);
        this.hiddenInput.setValue(valArray.join(", "));

        selected.remove();

        this.close();
        $.fire(this.input, "awesuggest-removecomplete");
    };

    _.prototype.deselectSelection = function() {
        this.selections.select("li[aria-selected=true]").each(function(selection) {
            selection.writeAttribute("aria-selected", "false");
        });
    };

    _.prototype.evaluate = function() {
        var value = this.input.getValue(),
            selectedValues = getValsAsArray($F(this.hiddenInput));

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

    function regEscape(s) { return s.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&"); }

    function getValsAsArray (values) {
        if (values.indexOf(",") > -1) {
            return values.split(/\s*,\s*/);
        }
        else if (values != "") {
            return [values]
        }
        return [];
    }

    function getTextContent (el) {
      if (el.textContent) {
        return el.textContent.trim();
      }
      return el.innerText;
    }

    function init() {
        $$("input.awesuggest").each(function (input) {
            new Awesuggest(input);
        });
    }

    // DOM already loaded?
    if (document.readyState !== "loading") {
        init();
    }
    else {
        // Wait for it
        Event.observe(window, "load", init);
    }

    _.$ = $;
    _.$$ = $$;

})($, $$);
