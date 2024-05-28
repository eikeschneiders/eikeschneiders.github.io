var consentQuestion = {
    type: jsPsychInstructions,
    pages: ['By clicking \"I agree\", you affirm that you are at least 18 years of age, which is the minimum age to participate in this study, and that you understand the nature of your participation in this research.<p>If you do not wish to participate, please close this window.'],
    show_clickable_nav: true,
    key_forward: " ",
    button_label_next: "I agree",
    allow_backward: false,
    data: {
        Condition: 'REMOVE', // For easier data processing
        Running: 'Consent'
      }
  }