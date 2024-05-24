// ETHICS

var PIS = {
    type: 'instructions',
    pages: [
        '<p><img src="images/logo.png" width="254px" height="55px" style="float:right"></img></p>' +

        '<br><br><b>Participant Information Sheet<br><div style = "left:3%; text-align: left;">Study Title:</b> Guessing and memory<br><br><b>Researcher:</b> Tina Seabrooke<br><b>ERGO number: 52932.A4<br><br></b>',
    ],
    show_clickable_nav: true,
    data: {
        Condition: 'REMOVE', // For easier data processing
        Running: 'Participant Information Statement'
    }
}

var consentQuestion = {
    type: 'instructions',
    pages: ['By clicking \"I agree\", you affirm that you are at least 18 years of age, which is the minimum age to participate in this study, and that you understand the nature of your participation in this research.<p>If you do not wish to participate, please close this window.'],
    show_clickable_nav: true,
    button_label_next: "I agree",
    data: {
        Condition: 'REMOVE', // For easier data processing
        Running: 'Consent'
    }
}

var consent = { timeline: [] };
consent.timeline.push(PIS, consentQuestion);

var debrief = {
    type: 'instructions',
    pages:
        [
            '<p><img src="images/logo.png" width="254px" height="55px" style="float:left"></img>' +

            '<br><br><p style = "left:3%; text-align: left;"><b>Guessing and memory<br>Debriefing statement </b><i>(written) </i>(Version no 1, 20/10/19)<br><b>ERGO ID: 52932</b>' +

            '<br><br>The aim of this research was to explore the effects of guessing on memory. Past research suggests that people tend to remember an answer better when they have first guessed the answer, compared to when they just study the answer (Kornell, Hays, & Bjork, 2009). Importantly, this pattern is apparent even when participants\' guesses are wrong (Potts & Shanks, 2014). The current research aims to examine why guesses are beneficial for memory, and the conditions in which guesses improve memory.' +

            '<br><br>Your data will help our understanding of the conditions in which taking tests help and hinder learning and memory. Once again results of this study will not include your name or any other identifying characteristics.  The experiment did not use deception. You may have a copy of this summary if you wish. Additionally, if you would like further information about this area of research then you may wish to look up the following references: ' +

            '<br><br>Kornell, N., Hays, M., & Bjork, R. A. (2009). Unsuccessful retrieval attempts enhance subsequent learning. <i>Journal of Experimental Psychology: Learning, Memory, and Cognition, 35</i>(4), 989-998. https://doi.org/10.1037/a0015729' +
            '<br><br>Potts, R., & Shanks, D. R. (2014). The benefit of generating errors during learning. <i>Journal of Experimental Psychology: General, 143</i>(2), 644-667. https://doi.org/10.1017/CBO9781107415324.004' +

            '<br><br><b>Important:</b> Please do not share the information we provide in this section with anyone who has not yet completed the experiment (e.g., by telling them what you did during the study, or why you were asked to do it). This may change their responses if they go on to complete the study, and it could jeopardise the project. Thank you for your participation in this research.' +

            '<br><br>Signature: T.SEABROOKE, Date 20/10/19 <br> Name: Dr Tina Seabrooke' +

            '<br><br>If you have questions about your rights as a participant in this research, or if you feel that you have been placed at risk, you may contact the University of Southampton Research Integrity and Governance Manager(023 8059 5058, rgoinfo@soton.ac.uk).'
        ],
    show_clickable_nav: true,
    data: {
        Condition: 'REMOVE', // For easier data processing
        Running: 'Debrief'
    }
};
