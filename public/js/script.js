// form repeater
$(document).ready(function () {
    // Initialize the Repeater plugin on elements with the class 'repeater'
    $('.repeater').repeater({
        initEmpty: false,  // Do not initialize with an empty repeater
        defaultValues: {
            'text-input': ''
        },
        show: function () {
            // Function to show the repeater element with a slide-down animation
            $(this).slideDown();
        },
        hide: function (deleteElement) {
            // Function to hide the repeater element with a slide-up animation
            $(this).slideUp(deleteElement);
            // Delay the generation of the CV by 500 milliseconds after hiding
            setTimeout(() => {
                generateCV();
            }, 500);
        },
        isFirstItemUndeletable: true  // The first item cannot be deleted
    });
});