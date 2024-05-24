/**
 * jspsych-survey-text
 * a jspsych plugin for free response survey questions
 *
 * Josh de Leeuw
 *
 * documentation: docs.jspsych.org
 *
 */

jsPsych.plugins['survey-text-timelimit'] = (function () {

  var plugin = {};

  plugin.info = {
    name: 'survey-text-timelimit',
    description: '',
    parameters: {
      questions: {
        type: jsPsych.plugins.parameterType.COMPLEX,
        array: true,
        pretty_name: 'Questions',
        default: undefined,
        nested: {
          prompt: {
            type: jsPsych.plugins.parameterType.STRING,
            pretty_name: 'Prompt',
            default: undefined,
            description: 'Prompt for the subject to response'
          },
          value: {
            type: jsPsych.plugins.parameterType.STRING,
            pretty_name: 'Value',
            default: "",
            description: 'The string will be used to populate the response field with editable answer.'
          },
          placeholder: {
            type: jsPsych.plugins.parameterType.STRING,
            pretty_name: 'Cursor',
            default: "",
            description: 'Textbox placeholder'
          },
          rows: {
            type: jsPsych.plugins.parameterType.INT,
            pretty_name: 'Rows',
            default: 1,
            description: 'The number of rows for the response text box.'
          },
          columns: {
            type: jsPsych.plugins.parameterType.INT,
            pretty_name: 'Columns',
            default: 40,
            description: 'The number of columns for the response text box.'
          }
        }
      },
      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Duration',
        default: null,
        description: 'The time allowed to respond.'
      },
      preamble: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Preamble',
        default: null,
        description: 'HTML formatted string to display at the top of the page above all the questions.'
      }//,
      // button_label: {
      //   type: jsPsych.plugins.parameterType.STRING,
      //   pretty_name: 'Button label',
      //   default: '',// 'Continue',
      //   description: 'The text that appears on the button to finish the trial.'
      // }
    }
  }


  plugin.trial = function (display_element, trial) {

    for (var i = 0; i < trial.questions.length; i++) {
      if (typeof trial.questions[i].rows == 'undefined') {
        trial.questions[i].rows = 1;
      }
    }
    for (var i = 0; i < trial.questions.length; i++) {
      if (typeof trial.questions[i].columns == 'undefined') {
        trial.questions[i].columns = 40;
      }
    }
    for (var i = 0; i < trial.questions.length; i++) {
      if (typeof trial.questions[i].value == 'undefined') {
        trial.questions[i].value = "";
      }
    }

    var html = '';
    // show preamble text
    if (trial.preamble !== null) {
      html += '<div id="jspsych-survey-text-preamble" class="jspsych-survey-text-preamble">' + trial.preamble + '</div>';

    }


    // add questions
    for (var i = 0; i < trial.questions.length; i++) {
      html += '<div id="jspsych-survey-text-"'+i+'" class="jspsych-survey-text-question" style="margin: 2em 0em;">';
      html += '<p class="jspsych-survey-text">' + trial.questions[i].prompt; // TS EDIT: present submit box on same line as prompt
      var autofocus = i == 0 ? "autofocus" : "";
      if (trial.questions[i].rows == 1) {

        html += '<input type="guessbox" autocomplete="off"  name="#jspsych-survey-text-response-' + i + '"size="' + trial.questions[i].columns + '" value="' +  trial.questions[i].value + '" ' + '" placeholder="' + trial.questions[i].placeholder + '"' + autofocus +
        '></input>';


      } else {
        html += '<textarea name="#jspsych-survey-text-response-' + i + '" cols="' + trial.questions[i].columns + '" rows="' + trial.questions[i].rows + '" ' + 
       autofocus +
          '>' + trial.questions[i].value + '</textarea>';
      }
      html += '</p></div>';
    }

    // TS EDIT: Remove submit button
    // add submit button
    // html += '<button id="jspsych-survey-text-next" class="jspsych-btn jspsych-survey-text">'+trial.button_label+'</button>';

    // TS EDIT: allow set amount of time (trial_duration) for participant to enter response
    jsPsych.pluginAPI.setTimeout(function () {
      // document.querySelector('#jspsych-survey-text-next').click()

      var question_data = {};
      var matches = display_element.querySelectorAll('div.jspsych-survey-text-question');
      for (var index = 0; index < matches.length; index++) {
        var id = "Q" + index;
        var val = matches[index].querySelector('textarea, input').value;
        val = val.toLowerCase(); // SERVER END: code all responses as lowercase
        var obje = {};
        obje[id] = val;
        Object.assign(question_data, obje);
      }

      // save data
      var trialdata = {
        "responses": JSON.stringify(question_data)
      };

      display_element.innerHTML = '';

     // next trial
      jsPsych.finishTrial(trialdata);
    }, trial.trial_duration);

    display_element.innerHTML = html;
  
    
    // TS EDIT: back up in case autofocus doesn't work
    display_element.querySelector('textarea, input').focus();

  };

  return plugin;
})();
