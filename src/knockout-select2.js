/* jshint boss:true*/
(function(factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery', 'knockout', 'module'], factory);
    } else {
        factory(jQuery, ko);
    }
})(function($, ko, module) {
    'use strict';

    var bindingName = 'select2';
    if (module && module.config() && module.config().name) {
        bindingName = module.config().name;
    }

    var dataBindingName = bindingName + 'Data';

    function triggerChangeQuietly(element, binding) {
        var isObservable = ko.isObservable(binding);
        var originalEqualityComparer;
        if (isObservable) {
            originalEqualityComparer = binding.equalityComparer;
            binding.equalityComparer = function() { return true; };
        }
        $(element).trigger('change');
        if (isObservable) {
            binding.equalityComparer = originalEqualityComparer;
        }
    }

    function addSelectedOption(data, element) {
        var $option = $("<option selected></option>")
            .val(data.id)
            .text(data.text);

        $(element).append($option);
    }

    function init(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var bindingValue = ko.unwrap(valueAccessor());
        var allBindings = allBindingsAccessor();
        var ignoreChange = false;
        var dataChangeHandler = null;
        var subscription = null;

        $(element).on('select2:selecting select2:unselecting', function() {
            ignoreChange = true;
        });
        $(element).on('select2:select select2:unselect', function() {
            ignoreChange = false;
        });

        if (ko.isObservable(allBindings.value)) {
            subscription = allBindings.value.subscribe(function(value) {
                if (ignoreChange) return;
                triggerChangeQuietly(element, this._target || this.target);
            });
        } else if (ko.isObservable(allBindings.selectedOptions)) {
            subscription = allBindings.selectedOptions.subscribe(function(value) {
                if (ignoreChange) return;
                triggerChangeQuietly(element, this._target || this.target);
            });
        }

        // Provide a hook for binding to the select2 "data" property;
        if (ko.isWriteableObservable(allBindings[dataBindingName])) {
            dataChangeHandler = function() {
                if (!$(element).data('select2')) return;

                // Just get id and text properties
                var data = $(element).select2('data').map(function (item) {
                    return {
                        id: (bindingValue.idIsString) ? item.id : parseInt(item.id, 10),
                        text: item.text
                    }
                });

                // Get the first item in array for single value selects
                if (!bindingValue.multiple) {
                    data = data[0];
                }
                allBindings[dataBindingName](data);
            };
            $(element).on('change', dataChangeHandler);

            subscription = allBindings[dataBindingName].subscribe(function (value) {
                if (ignoreChange) return;

                // Clear value and remove selected text
                if (!value) {
                    $(element).val(null).trigger('change');
                }
                // Add multiple selections
                else if (Array.isArray(value)) {
                    value.forEach(function (item) {
                        addSelectedOption(item, element)
                    });
                }
                // Add single single selection
                else {
                    addSelectedOption(value, element)
                }
            });
        }

        // Apply select2
        $(element).select2(bindingValue);

        // Initialize data
        if (dataBindingName in allBindings) {
            var data = ko.unwrap(allBindings[dataBindingName]);
            if (Array.isArray(data)) {
                data.forEach(function (item) {
                    addSelectedOption(item, element)
                });
            }
            else if (data) {
                addSelectedOption(data, element)
            }
        }

        // Destroy select2 on element disposal
        ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
            $(element).select2('destroy');
            if (dataChangeHandler !== null) {
                $(element).off('change', dataChangeHandler);
            }
            if (subscription !== null) {
                subscription.dispose();
            }
        });
    }

    return ko.bindingHandlers[bindingName] = {
        init: function() {
            // Delay to allow other binding handlers to run, as this binding handler depends on options bindings
            var args = arguments;
            setTimeout(function() {
                init.apply(null, args);
            }, 0);
        }
    };
});
