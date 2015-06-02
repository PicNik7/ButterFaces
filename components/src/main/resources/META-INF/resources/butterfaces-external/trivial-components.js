/*
 Copyright 2015 Yann Massard (Trivial Components)

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
(function (factory) {
    "use strict";

    if (typeof define === 'function' && define.amd) {
        // Define as an AMD module if possible
        define('trivial-combobox', ['jquery', 'mustache'], factory);
    }
    else if (typeof exports === 'object') {
        // Node/CommonJS
        module.exports = factory(require('jquery', 'mustache'));
    }
    else if (jQuery && !jQuery.fn.trivialcombobox) {
        // Define using browser globals otherwise
        // Prevent multiple instantiations if the script is loaded twice
        factory(jQuery, Mustache);
    }
}(function ($, Mustache) {

    var icon2LinesTemplate = '<div class="combobox-entry combobox-entry-icon-2-lines">' +
        '  <div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>' +
        '  <div class="content-wrapper editor-area"> ' +
        '    <div class="main-line">{{displayValue}}</div> ' +
        '    <div class="additional-info">{{additionalInfo}}</div>' +
        '  </div>' +
        '</div>';
    var iconSingleLineTemplate = '<div class="combobox-entry combobox-entry-icon-single-line">' +
        '  <div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>' +
        '  <div class="content-wrapper editor-area">{{displayValue}}</div>' +
        '</div>';
    var singleLineTemplate = '<div class="combobox-entry combobox-entry-single-line">' +
        '  <div class="content-wrapper editor-area"> ' +
        '    <div>{{displayValue}}</div> ' +
        '  </div>' +
        '</div>';
    var defaultTemplate = icon2LinesTemplate;
    var defaultSpinnerTemplate = '<div class="tr-combobox-spinner"><div>Fetching data...</div></div>';
    var defaultNoEntriesTemplate = '<div class="tr-combobox-no-data"><div>No matching entries...</div></div>';
    var defaultQueryFunctionFactory = function (entries) {
        function filterElements(queryString) {
            var visibleEntries = [];
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                var $entryElement = entry._trComboBoxEntryElement;
                if ($entryElement.is(':containsIgnoreCase(' + queryString + ')')) {
                    visibleEntries.push(entry);
                }
            }
            return visibleEntries;
        }

        return function (queryString, resultCallback) {
            resultCallback(filterElements(queryString));
        }
    };

    function isTabOrModifierKey(e) {
        return e.keyCode == 9 || e.keyCode >= 16 && e.keyCode <= 20 || e.keyCode === 91 || e.keyCode == 92;
    }

    function TrivialComboBox(originalInput, options) {
        options = options || {};
        var config = $.extend({
            valueProperty: null,
            inputTextProperty: 'displayValue',
            template: defaultTemplate,
            selectedEntryTemplate: options.template || defaultTemplate,
            spinnerTemplate: defaultSpinnerTemplate,
            noEntriesTemplate: defaultNoEntriesTemplate,
            entries: null,
            selectedEntry: undefined,
            emptyEntry: {},
            queryFunction: defaultQueryFunctionFactory(options.entries || []),
            aggressiveAutoComplete: true,
            autoCompleteDelay: 0,
            allowFreeText: false
        }, options);

        var isDropDownOpen = false;
        var entries = config.entries;
        var selectedEntry;
        var highlightedEntry = null;
        var blurCausedByClickInsideComponent = false;
        var autoCompleteTimeoutId = -1;
        var doNoAutoCompleteBecauseBackspaceWasPressed = false;

        var $originalInput = $(originalInput);
        var $comboBox = $('<div class="tr-combobox"/>').insertAfter($originalInput);
        var $selectedEntryWrapper = $('<div class="tr-combobox-selected-entry-wrapper"/>').appendTo($comboBox);
        var $trigger = $('<div class="tr-combobox-trigger"><span class="tr-combobox-trigger-icon"/></div>').appendTo($comboBox);
        var $dropDown = $('<div class="tr-combobox-dropdown"></div>').appendTo("body");
        var $editor;
        if (config.valueProperty) {
            $originalInput.addClass("tr-original-input");
            $editor = $('<input type="text"/>');
        } else {
            $editor = $originalInput;
        }
        $editor.prependTo($comboBox).addClass("tr-combobox-edit-input")
            .focus(function () {
                $comboBox.addClass('focus');
                if (entries == null) {
                    query();
                }
            })
            .blur(function () {
                if (!blurCausedByClickInsideComponent) {
                    $comboBox.removeClass('focus');
                    if (!config.allowFreeText && !isEntrySelected() && $originalInput.val().length > 0) {
                        $originalInput.val(""); // delete the contents of the original input, because free text is not allowed!
                        entries = null; // so we will query again when we combobox is re-focused
                    }
                    hideEditorIfAppropriate();
                    closeDropDown();
                }
            })
            .keydown(function (e) {
                if (isTabOrModifierKey(e)) {
                    return; // tab or modifier key was pressed...
                } else if (e.keyCode == 37 || e.keyCode == 39) { // left or right
                    showEditor();
                    return; // let the user navigate freely...
                } else if (e.keyCode == 8) { // backspace
                    doNoAutoCompleteBecauseBackspaceWasPressed = true; // we want query results, but no autocomplete
                }

                if (e.keyCode == 38 || e.keyCode == 40) { // up or down key
                    if (!isDropDownOpen) {
                        openDropDown();
                        showEditor();
                    }
                    if (e.keyCode == 38) { // up
                        var newHighlightedEntry = getNextHighlightableEntry(-1);
                        setHighlightedEntry(newHighlightedEntry);
                        autoCompleteIfPossible(newHighlightedEntry[config.inputTextProperty]);
                        e.preventDefault(); // some browsers move the caret to the beginning on up key
                    } else if (e.keyCode == 40) { // down
                        var newHighlightedEntry = getNextHighlightableEntry(1);
                        setHighlightedEntry(newHighlightedEntry);
                        autoCompleteIfPossible(newHighlightedEntry[config.inputTextProperty]);
                        e.preventDefault(); // some browsers move the caret to the end on down key
                    }
                } else if (isDropDownOpen && e.keyCode == 13) { // enter
                    selectEntry(highlightedEntry);
                    closeDropDown();
                    hideEditorIfAppropriate();
                    $editor.select();
                } else if (e.keyCode == 27) { // escape
                    closeDropDown();
                    hideEditorIfAppropriate();
                } else {
                    query();
                    showEditor();
                    openDropDown();
                }
            })
            .keyup(function (e) {
                if (!isTabOrModifierKey(e) && e.keyCode != 13 && isEntrySelected() && $editor.val() !== selectedEntry[config.inputTextProperty]) {
                    selectEntry(null);
                }
            })
            .mousedown(function () {
                openDropDown();
            });

        $comboBox.add($dropDown).mousedown(function () {
            if ($editor.is(":focus")) {
                blurCausedByClickInsideComponent = true;
            }
        }).mouseup(function () {
            if (blurCausedByClickInsideComponent) {
                $editor.focus();
                blurCausedByClickInsideComponent = false;
            }
        }).mouseout(function () {
            if (blurCausedByClickInsideComponent) {
                $editor.focus();
                blurCausedByClickInsideComponent = false;
            }
        });

        if (entries) { // if config.entries was set...
            updateDropDownEntryElements(entries);
        }

        selectEntry(config.selectedEntry || null);

        $selectedEntryWrapper.click(function () {
            $editor.select();
            openDropDown();
            showEditor();
        });
        $trigger.mousedown(function () {
            if (isDropDownOpen) {
                closeDropDown();
                showEditor();
            } else {
                $editor.select();
                openDropDown();
                showEditor();
            }
        });

        function updateDropDownEntryElements(entries) {
            $dropDown.empty();
            if (entries.length > 0) {
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    var html = Mustache.render(config.template, entry);
                    var $entry = $(html).addClass("tr-combobox-entry filterable-item").appendTo($dropDown);
                    entry._trComboBoxEntryElement = $entry;
                    (function (entry) {
                        $entry
                            .mousedown(function () {
                                selectEntry(entry);
                                closeDropDown();
                                hideEditorIfAppropriate();
                                $editor.select();
                            })
                            .mouseover(function () {
                                setHighlightedEntry(entry);
                            });
                    })(entry);
                }
            } else {
                $dropDown.append(config.noEntriesTemplate);
            }
        }

        function updateEntries(newEntries, showToUser) {
            entries = newEntries;
            updateDropDownEntryElements(entries);

            if (entries.length > 0) {
                setHighlightedEntry(entries[0]);
                highlightTextMatches();

                if (showToUser) {
                    openDropDown();
                    if (config.aggressiveAutoComplete) {
                        autoCompleteIfPossible(highlightedEntry[config.inputTextProperty], config.autoCompleteDelay);
                    }
                }
            } else {
                setHighlightedEntry(null);
            }
        }

        function query() {
            $dropDown.append(config.spinnerTemplate);

            // call queryFunction asynchronously to be sure the input field has been updated before the result callback is called. Note: the query() method is called on keydown...
            setTimeout(function () {
                config.queryFunction($editor.val(), function (newEntries) {
                    updateEntries(newEntries, true);
                });
            });
        }

        function setHighlightedEntry(entry) {
            highlightedEntry = entry;
            $dropDown.find('.tr-combobox-entry').removeClass('tr-highlighted');
            if (entry != null) {
                entry._trComboBoxEntryElement.addClass('tr-highlighted');
                $dropDown.minimallyScrollTo(entry._trComboBoxEntryElement);
            }
        }

        function selectEntry(entry) {
            if (entry == null) {
                if (config.valueProperty)  {
                    $originalInput.val("");
                } // else the $originalInput IS the $editor
                selectedEntry = config.emptyEntry;
                var $selectedEntry = $(Mustache.render(config.selectedEntryTemplate, selectedEntry))
                    .addClass("tr-combobox-entry")
                    .addClass("empty");
                $selectedEntryWrapper.empty().append($selectedEntry);
            } else {
                if (config.valueProperty) {
                    $originalInput.val(entry[config.valueProperty]);
                } // else the $originalInput IS the $editor
                selectedEntry = entry;
                var $selectedEntry = $(Mustache.render(config.selectedEntryTemplate, selectedEntry))
                    .addClass("tr-combobox-entry");
                $selectedEntryWrapper.empty().append($selectedEntry);
                $editor.val(selectedEntry[config.inputTextProperty]);
            }
        }

        function isEntrySelected() {
            return selectedEntry != null && selectedEntry !== config.emptyEntry;
        }

        function showEditor() {
            var $editorArea = $selectedEntryWrapper.find(".editor-area");
            $editor.css({
                "width": $editorArea.width() + "px",
                "height": ($editorArea.height()) + "px"
            })
                .position({
                    my: "left top",
                    at: "left top",
                    of: $editorArea
                })
                .focus();
        }

        function hideEditorIfAppropriate() {
            if (!(config.allowFreeText && $editor.val().length > 0 && !isEntrySelected())) {
                $editor.width(0).height(0);
            }
        }

        function openDropDown() {
            $comboBox.addClass("open");
            $dropDown
                .show()
                .position({
                    my: "left top",
                    at: "left bottom",
                    of: $comboBox
                })
                .width($comboBox.width());
            isDropDownOpen = true;
        }

        function closeDropDown() {
            $comboBox.removeClass("open");
            $dropDown.hide();
            isDropDownOpen = false;
        }

        function getNonSelectedEditorValue() {
            return $editor.val().substring(0, $editor[0].selectionStart);
        }

        function autoCompleteIfPossible(autoCompletingEntryDisplayValue, delay) {
            clearTimeout(autoCompleteTimeoutId);
            if (!doNoAutoCompleteBecauseBackspaceWasPressed) {
                autoCompleteTimeoutId = setTimeout(function () {
                    var oldEditorValue = getNonSelectedEditorValue();
                    var newEditorValue;
                    if (autoCompletingEntryDisplayValue.toLowerCase().indexOf(oldEditorValue.toLowerCase()) === 0) {
                        newEditorValue = oldEditorValue + autoCompletingEntryDisplayValue.substr(oldEditorValue.length);
                    } else {
                        newEditorValue = getNonSelectedEditorValue();
                    }
                    $editor.val(newEditorValue);
                    setTimeout(function () { // we need this to guarantee that the editor has been updated...
                        $editor[0].setSelectionRange(oldEditorValue.length, newEditorValue.length);
                    }, 0);
                }, delay || 0);
            }
            doNoAutoCompleteBecauseBackspaceWasPressed = false;
        }

        function getAllVisibleEntries() {
            var visibleEntries = [];
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                if (entry._trComboBoxEntryElement.is(':visible')) {
                    visibleEntries.push(entry);
                }
            }
            return visibleEntries;
        }

        function getNextHighlightableEntry(direction) {
            var visibleEntries = getAllVisibleEntries();
            var newHighlightedElementIndex;
            if (highlightedEntry == null && direction > 0) {
                newHighlightedElementIndex = -1 + direction;
            } else if (highlightedEntry == null && direction < 0) {
                newHighlightedElementIndex = visibleEntries.length + direction;
            } else {
                var currentHighlightedElementIndex = visibleEntries.indexOf(highlightedEntry);
                newHighlightedElementIndex = (currentHighlightedElementIndex + visibleEntries.length + direction) % visibleEntries.length;
            }
            return visibleEntries[newHighlightedElementIndex];
        }

        function highlightTextMatches() {
            var nonSelectedEditorValue = getNonSelectedEditorValue();
            for (var i = 0; i < entries.length; i++) {
                var $entryElement = entries[i]._trComboBoxEntryElement;
                $entryElement.trivialHighlight(nonSelectedEditorValue, "tr-search-highlighted");
            }
        }

        this.$ = $comboBox;
        $comboBox[0].trivialComboBox = this;
        this.updateEntries = updateEntries;
    }

    $.fn.trivialcombobox = function (options) {
        var $comboBoxes = [];
        this.each(function () {
            var existingComboBoxWrapper = $(this).parents('.tr-combobox').addBack('.tr-combobox');
            if (existingComboBoxWrapper.length > 0 && existingComboBoxWrapper[0].trivialComboBox) {
                $comboBoxes.push(existingComboBoxWrapper[0].trivialComboBox.$);
            } else{
                var comboBox = new TrivialComboBox(this, options);
                $comboBoxes.push(comboBox.$);
            }
        });
        return $($comboBoxes);
    };
    $.fn.TrivialComboBox = function (options) {
        var comboBoxes = [];
        this.each(function () {
            var existingComboBoxWrapper = $(this).parents('.tr-combobox').addBack('.tr-combobox');
            if (existingComboBoxWrapper.length > 0 && existingComboBoxWrapper[0].trivialComboBox) {
                comboBoxes.push(existingComboBoxWrapper[0].trivialComboBox);
            } else{
                var comboBox = new TrivialComboBox(this, options);
                comboBoxes.push(comboBox);
            }
        });
        return comboBoxes.length == 1 ? comboBoxes[0] : comboBoxes;
    };

    $.fn.trivialcombobox.icon2LinesTemplate = icon2LinesTemplate;
    $.fn.TrivialComboBox.icon2LinesTemplate = icon2LinesTemplate;
    $.fn.TrivialComboBox.iconSingleLineTemplate = iconSingleLineTemplate;
    $.fn.TrivialComboBox.iconSingleLineTemplate = iconSingleLineTemplate;
    $.fn.trivialcombobox.singleLineTemplate = singleLineTemplate;
    $.fn.TrivialComboBox.singleLineTemplate = singleLineTemplate;

    return $.fn.TrivialComboBox;
})
);

/*
 Copyright 2015 Yann Massard (Trivial Components)

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
(function ($) {
    $.expr[":"].containsIgnoreCase = $.expr.createPseudo(function (arg) {
        return function (elem) {
            return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
        };
    });
})(jQuery);

(function ($) {
    $.fn.trivialHighlight = function (searchString, highlightClassName) {
        var regex = new RegExp(searchString, "gi");
        return this.find('*').each(function () {
            var $this = $(this);

            $this.find('.' + highlightClassName).contents().unwrap();
            this.normalize();

            if (searchString && searchString !== '') {
                $this.contents().filter(function () {
                    return this.nodeType == 3 && regex.test(this.nodeValue);
                }).replaceWith(function () {
                    return (this.nodeValue || "").replace(regex, function (match) {
                        return "<span class=\"" + highlightClassName + "\">" + match + "</span>";
                    });
                });
            }
        });
    };
}(jQuery));
/*
 Copyright 2015 Yann Massard (Trivial Components)

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
$.fn.minimallyScrollTo = function (target) {
    return this.each(function () {
        var $this = $(this);

        var viewPortMinY = $this.scrollTop();
        var viewPortMaxY = viewPortMinY + $this.innerHeight();

        var targetMinY = $(target).offset().top - $(this).offset().top + $this.scrollTop();
        var targetMaxY = targetMinY + target.height();

        if (targetMinY < viewPortMinY) {
            $this.scrollTop(targetMinY);
        } else if (targetMaxY > viewPortMaxY) {
            $this.scrollTop(targetMaxY - $this.innerHeight());
        }
    });
};