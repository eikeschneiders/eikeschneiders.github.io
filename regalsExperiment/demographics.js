// RECORD DEMOGRAPHICS, BROWSER, AND PROLIFIC ID

// Check if experiment is being run locally or on a server
if (document.location.host) { // returns your host or null
    online = true;
} else {
    online = false;
};

var prolific = {
    type: jsPsychSurveyText,//'survey-text-req',
    questions: [
        { prompt: "Please enter your Prolific ID below: ", required: true, placeholder: '' }],
    on_finish: function (data) {
        //var responses = JSON.parse(data.responses);
        //var prolific_ID = responses.Q0;
        var prolific_ID = data.responses.Q0
        jsPsych.data.addProperties({
            prolific_ID: prolific_ID
        });
    },
    data: {
        Condition: 'REMOVE', // For easier data processing
        Running: 'Prolific question'
    }
};

var browser = {
    type: jsPsychSurveyMultiChoice,//'survey-multi-choice',
    questions: [{
        prompt: "We would now like you to answer a few quick questions.<p> The study advert stated that you should run the study in either <b> Chrome or Microsoft Edge, using a desktop or laptop PC (not a phone or tablet)</b>. We cannot guarantee that the study will run properly in other browsers or on phones/tablets. Please do not attempt to use a different browser or a phone or tablet.<br>Please tell us which browser you are using to view this study.",
        options: ["Chrome", "Microsoft Edge", "Other"],
        required: true,
        horizontal: true
    }],
    on_finish: function (data) {
        var responses = JSON.parse(data.responses);
        var code = responses.Q0;
        jsPsych.data.addProperties({ browser: code });
    },
    data: {
        Condition: 'REMOVE', // For easier data processing
        Running: 'Browser question'
    }
};

/*jsPsych.data.addProperties({
    OtherBrowser: ''
});
*/

var browserMessage = {
    type: jsPsychSurveyText,//'survey-text-req',
    questions: [
        { prompt: "Which browser are you using to view this study?", required: true, placeholder: '' }],
    on_finish: function (data) {
        var responses = JSON.parse(data.responses);
        var otherBrowser = responses.Q0;

        jsPsych.data.addProperties({
            OtherBrowser: otherBrowser
        });
    }
};

var browser_if_chunk = {
    chunk_type: 'if',
    timeline: [browserMessage],
    conditional_function: function () {
        var data = jsPsych.data.get().last(1).values()[0].browser;
        return data == 'Other'; // Participant selected 'other'
    },
};

// get participant's age and add it to the datafile
var age = {
    type: jsPsychSurveyText,//'survey-text-req',
    questions: [{
        prompt: "Please enter your age: ",
        required: true,
        placeholder: ''
    }],
    on_finish: function (data) {
        var responses = JSON.parse(data.responses);
        var code = responses.Q0;
        jsPsych.data.addProperties({ age: code });
    },
    data: {
        Condition: 'REMOVE', // For easier data processing
        Running: 'Age question'
    }
};

// get participant's gender and add it to the datafile
var gender = {
    type: jsPsychSurveyMultiChoice,//'survey-multi-choice',
    questions: [{
        prompt: "Please enter your gender.",
        options: ["Male", "Female", "I don't want to say"],
        required: true,
        horizontal: true
    },],
    on_finish: function (data) {
        var responses = JSON.parse(data.responses);
        var code = responses.Q0;
        jsPsych.data.addProperties({ gender: code });
    },
    data: {
        Condition: 'REMOVE', // For easier data processing
        Running: 'Gender question'
    }
};

// get participant's English language capacity and add it to the datafile
var english = {
    type: jsPsychSurveyMultiChoice,//'survey-multi-choice',
    questions: [{
        prompt: "Do you speak English fluently?",
        options: ["Yes", "No"],
        required: true,
        horizontal: true
    },],
    on_finish: function (data) {
        var responses = JSON.parse(data.responses);
        var code = responses.Q0;
        jsPsych.data.addProperties({ english: code });
    },
    data: {
        Condition: 'REMOVE', // For easier data processing
        Running: 'English question'
    }
};

var botCheck = {

    type: jsPsychHtmlKeyboardResponse, //'html-keyboard-response',
    stimulus: 'We need to make sure that real people complete this study. To check that you are a real person, please tell us which letter in the grid below is presented in <span style="color:red"><b>red</b></span>. Please press the corresponding letter on your keyboard.<p><img src="images/botcheck.png" width="200px" height="200px">',
    choices: "ALL_KEYS",
    data: {
        Condition: 'REMOVE', // For easier data processing
        Running: 'BotCheck question'
    },
    on_finish: function (data) {

        if (data.key_press == '87') { // the correct answer is w. 87 is the key code for w.
            var acc = 1;
        } else {
            var acc = 0;
        };

        jsPsych.data.addProperties({
            BotCheckResp: data.key_press,
            BotCheckAcc: acc
        })
    }
};

var startExp = {
    type: jsPsychInstructions,//'instructions',
    pages: [
        'Thanks for answering those questions. You are now ready to start the study. When you click \'Next\', you will receive a warning message that the experiment will switch to full screen. Before you begin, please:<br>' +
        '<ul> <li> Turn off music, cell phones and other devices that might be distracting.</li>' +
        '<li> Complete the experiment in one sitting. </li>' +
        '<li> Keep the browser in full screen and do not visit other webpages during the study. <i>We monitor when participants enter and exit fullscreen, so please do keep the study in fullscreen throughout.</i></li></ul>'
    ],
    show_clickable_nav: true,
    data: {
        Condition: 'REMOVE', // For easier data processing
        Running: 'Ready-to-start instructions'
    }
};

var demographics = { timeline: [] };

if (online == true) {
    demographics.timeline.push(prolific);
}

demographics.timeline.push(
    browser,
    browser_if_chunk,
    age,
    gender,
    english,
    botCheck,
    startExp
);