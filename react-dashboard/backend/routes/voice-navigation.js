// Voice Navigation System for AI Tutor
const { User, Lesson, Test } = require('../models');
const { LanguageTranslator } = require('../services/language-translator');
const aiTutorService = require('../services/aiTutor');

// Navigation commands mapping
const NAVIGATION_COMMANDS = {
  '1': 'repeat_lesson',
  '2': 'next_lesson', 
  '3': 'previous_lesson',
  '4': 'end_session',
  'jedna': 'repeat_lesson',
  'dva': 'next_lesson',
  'tři': 'previous_lesson',
  'čtyři': 'end_session',
  'zopakovat': 'repeat_lesson',
  'další': 'next_lesson',
  'předchozí': 'previous_lesson',
  'ukončit': 'end_session'
};

// Conversation states
const CONVERSATION_STATES = {
  LESSON_PLAYING: 'lesson_playing',
  LESSON_COMPLETED: 'lesson_completed', 
  TEST_ACTIVE: 'test_active',
  TEST_COMPLETED: 'test_completed',
  NAVIGATION_MENU: 'navigation_menu'
};

// Voice Navigation Manager
class VoiceNavigationManager {
  static conversationStates = new Map();
  
  // Initialize conversation state
  static async initializeState(callSid, lessonData) {
    // CRITICAL: Declare questions variable outside try block
    let questions = [];
    
    try {
      // CRITICAL: Load test questions for this lesson
      console.log(`🔍 Loading test questions for lesson: ${lessonData.title} (ID: ${lessonData.id})`);
      
      try {
        // Import lesson-selector to use loadTestQuestionsFromDB
        const { loadTestQuestionsFromDB } = require('./lesson-selector');
        console.log(`📥 Imported loadTestQuestionsFromDB function`);
        
        questions = await loadTestQuestionsFromDB(lessonData.id);
        console.log(`📚 loadTestQuestionsFromDB returned:`, {
          questionsType: typeof questions,
          questionsLength: Array.isArray(questions) ? questions.length : 'not array',
          questionsData: questions
        });
        
        console.log(`📚 Loaded ${questions.length} test questions for lesson`);
      } catch (loadError) {
        console.error('❌ Error loading test questions:', loadError);
        console.error('❌ Error stack:', loadError.stack);
        // Don't throw, just set questions to empty array
        questions = [];
      }
      
    // Initialize AI Tutor session if user is available
    let tutorSession = null;
    if (lessonData.user_id) {
      try {
        console.log(`🎓 Initializing AI Tutor session for user ${lessonData.user_id}`);
        const result = await aiTutorService.startLessonSession(
          lessonData.user_id,
          lessonData.lesson_id,
          callSid
        );
        
        if (result.success) {
          tutorSession = result.sessionData;
          console.log(`✅ AI Tutor session created successfully`);
        }
      } catch (error) {
        console.error(`❌ Failed to initialize AI Tutor session:`, error);
      }
    }

    const state = {
      callSid,
        lesson: {
          ...lessonData,
          questions: questions  // ← Store questions in lesson state!
        },
      currentState: CONVERSATION_STATES.LESSON_PLAYING,
      currentQuestionIndex: 0,
      userAnswers: [],
      score: 0,
        totalQuestions: questions.length,  // ← Set totalQuestions!
      userLanguage: lessonData.language || 'cs',
      lessonCompleted: false,
      testCompleted: false,
      navigationHistory: [],
      recordingUrl: null,
      recordingDuration: null,
      tutorSession: tutorSession  // Store AI Tutor session
    };
    
    this.conversationStates.set(callSid, state);
    console.log(`🎯 NEW: Voice Navigation initialized for lesson: ${lessonData.title}`);
      console.log(`📊 State: ${state.currentState}, Questions: ${questions.length}`);
    } catch (error) {
      console.error('❌ Error initializing state with questions:', error);
      // Fallback: initialize without questions
      const state = {
        callSid,
        lesson: lessonData,
        currentState: CONVERSATION_STATES.LESSON_PLAYING,
        currentQuestionIndex: 0,
        userAnswers: [],
        score: 0,
        totalQuestions: questions.length,  // ← Now questions is available!
        userLanguage: lessonData.language || 'cs',
        lessonCompleted: false,
        testCompleted: false,
        navigationHistory: [],
        recordingUrl: null,
        recordingDuration: null
      };
      
      this.conversationStates.set(callSid, state);
      console.log(`🎯 NEW: Voice Navigation initialized for lesson: ${lessonData.title} (without questions)`);
      console.log(`📊 State: ${state.currentState}, Questions: ${questions.length}`);
    }
  }

  // Get conversation state
  static getState(callSid) {
    return this.conversationStates.get(callSid);
  }

  // Update conversation state
  static updateState(callSid, updates) {
    const state = this.getState(callSid);
    if (state) {
      Object.assign(state, updates);
      console.log(`🔄 State updated: ${state.currentState}`);
    }
  }

  // Process user response with navigation and AI Tutor integration
  static async processUserResponse(userInput, callSid, userPhone) {
    const state = this.getState(callSid);
    if (!state) {
      console.log('❌ No conversation state found');
      return { questionType: 'error', feedback: 'Omlouvám se, došlo k chybě.' };
    }

    console.log(`🎯 Processing user input: "${userInput}" in state: ${state.currentState}`);

    // If AI Tutor session is available, use it for processing
    if (state.tutorSession) {
      try {
        console.log(`🎓 Using AI Tutor for processing user input`);
        const tutorResponse = await aiTutorService.processUserMessage(
          callSid,
          userInput,
          state.tutorSession.userId
        );
        
        console.log(`🤖 AI Tutor response: ${tutorResponse.phase}`);
        
        // Convert AI Tutor response to Twilio format
        return this.convertTutorResponseToTwilio(tutorResponse, state);
        
      } catch (error) {
        console.error(`❌ AI Tutor processing error:`, error);
        // Fall back to original logic
      }
    }

    // Process based on current state
    switch (state.currentState) {
      case CONVERSATION_STATES.LESSON_PLAYING:
        return this.handleLessonPhase(userInput, state, userPhone);
      
      case CONVERSATION_STATES.LESSON_COMPLETED:
        return this.handleLessonCompleted(userInput, state, userPhone);
      
      case CONVERSATION_STATES.TEST_ACTIVE:
        return this.handleTestPhase(userInput, state, userPhone);
      
      case CONVERSATION_STATES.TEST_COMPLETED:
        return this.handleTestCompleted(userInput, state, userPhone);
      
      case CONVERSATION_STATES.NAVIGATION_MENU:
        return this.handleNavigationMenu(userInput, state, userPhone);
      
      default:
        return this.handleLessonPhase(userInput, state, userPhone);
    }
  }

  // Convert AI Tutor response to Twilio format
  static convertTutorResponseToTwilio(tutorResponse, state) {
    const { message, phase, action, results } = tutorResponse;
    
    switch (phase) {
      case 'introduction':
        return {
          questionType: 'lesson_intro',
          feedback: message,
          nextQuestion: null
        };
        
      case 'content':
        return {
          questionType: 'lesson_content',
          feedback: message,
          nextQuestion: null
        };
        
      case 'test':
        return {
          questionType: 'test_question',
          feedback: message,
          nextQuestion: null
        };
        
      case 'evaluation':
        return {
          questionType: 'test_results',
          feedback: message,
          nextQuestion: null,
          score: results?.percentage || 0,
          totalQuestions: results?.totalQuestions || 0,
          correctAnswers: results?.correctCount || 0
        };
        
      case 'completed':
        return {
          questionType: 'session_complete',
          feedback: message,
          nextQuestion: null
        };
        
      default:
        return {
          questionType: 'lesson_content',
          feedback: message || 'Pokračujeme v lekci.',
          nextQuestion: null
        };
    }
  }

  // Check for navigation commands
  static checkNavigationCommand(userInput) {
    const cleanInput = userInput.toLowerCase().trim();
    
    for (const [command, action] of Object.entries(NAVIGATION_COMMANDS)) {
      if (cleanInput.includes(command)) {
        console.log(`🎮 Navigation command detected: ${command} → ${action}`);
        return action;
      }
    }
    
    return null;
  }

  // Handle navigation commands
  static async handleNavigation(command, state, userPhone) {
    console.log(`🎮 Handling navigation command: ${command}`);
    
    switch (command) {
      case 'repeat_lesson':
        state.currentState = CONVERSATION_STATES.LESSON_PLAYING;
        state.currentQuestionIndex = 0;
        state.userAnswers = [];
        state.score = 0;
        
        return {
          questionType: 'lesson',
          feedback: 'Zopakujeme lekci.',
          nextQuestion: this.formatLessonContent(state.lesson),
        };
      
      case 'next_lesson':
        return await this.loadNextLesson(state, userPhone);
      
      case 'previous_lesson':
        return await this.loadPreviousLesson(state, userPhone);
      
      case 'end_session':
        return {
          questionType: 'session_complete',
          feedback: 'Děkuji za účast. Na shledanou!'
        };
      
      default:
        return {
          questionType: 'error',
          feedback: 'Nerozumím příkazu. Zkuste to znovu.'
        };
    }
  }

  // Handle lesson completion
  static async handleLessonCompleted(userInput, state, userPhone) {
    console.log('📚 Lesson completed, starting test...');
    
    state.currentState = CONVERSATION_STATES.TEST_ACTIVE;
    state.currentQuestionIndex = 0;
    state.totalQuestions = state.lesson.questions ? state.lesson.questions.length : 0;
    
    console.log(`🔍 Debug: questions array length = ${state.lesson.questions ? state.lesson.questions.length : 'undefined'}`);
    console.log(`🔍 Debug: totalQuestions = ${state.totalQuestions}`);
    
    if (state.totalQuestions === 0) {
      console.log('⚠️ No questions found, ending session');
      return {
        questionType: 'session_complete',
        feedback: 'Lekce dokončena. Test není k dispozici.'
      };
    }
    
    const firstQuestion = this.formatTestQuestion(state.lesson.questions[0], state.userLanguage);
    console.log(`✅ Starting test with first question: ${firstQuestion.substring(0, 100)}...`);
    console.log(`🔍 DEBUG: Full first question: "${firstQuestion}"`);    
    return {
      questionType: 'test',
      feedback: 'Lekce dokončena. Začínáme test.',
      nextQuestion: firstQuestion
    };
  }

  // Handle test completion
  static async handleTestCompleted(userInput, state, userPhone) {
    console.log('🎓 Test completed, checking for next lesson...');
    
    // CRITICAL DEBUG: Check all possible sources of totalQuestions
    const questionsFromLesson = state.lesson?.questions?.length || 0;
    const questionsFromUserAnswers = state.userAnswers?.length || 0;
    const questionsFromState = state.totalQuestions || 0;
    
    console.log(`🔍 CRITICAL DEBUG: totalQuestions sources:`, {
      fromLesson: questionsFromLesson,
      fromUserAnswers: questionsFromUserAnswers, 
      fromState: questionsFromState,
      score: state.score
    });
    
    // Use the most reliable source (userAnswers length since it tracks actual completed questions)
    let actualTotalQuestions = Math.max(questionsFromUserAnswers, questionsFromState, questionsFromLesson);
    
    // CRITICAL FIX: If actualTotalQuestions is 0, something is wrong - use fallback
    if (actualTotalQuestions === 0) {
      console.log('🚨 CRITICAL ERROR: actualTotalQuestions is 0! Using fallback value of 3');
      actualTotalQuestions = 3; // Fallback to prevent division by zero
    }
    
    console.log(`🎯 Using actualTotalQuestions: ${actualTotalQuestions}`);
    
    // CRITICAL DEBUG: Verify score calculation
    const calculatedPercentage = actualTotalQuestions > 0 ? Math.round((state.score / actualTotalQuestions) * 100) : 0;
    console.log(`📊 Final score: ${state.score}/${actualTotalQuestions} (${calculatedPercentage}%)`);
    
    // Count actual correct answers from userAnswers for verification
    const correctAnswersFromUserAnswers = state.userAnswers?.filter(answer => answer.correct).length || 0;
    console.log(`🔍 VERIFICATION: Correct answers from userAnswers: ${correctAnswersFromUserAnswers}/${questionsFromUserAnswers}`);
    
    console.log(`🔍 DEBUG: Test completion details:`, {
      score: state.score,
      totalQuestions: state.totalQuestions,
      actualTotalQuestions: actualTotalQuestions,
      userAnswersLength: state.userAnswers ? state.userAnswers.length : 0,
      currentQuestionIndex: state.currentQuestionIndex,
      lessonTitle: state.lesson?.title,
      callSid: state.callSid,
      correctAnswersFromUserAnswers: correctAnswersFromUserAnswers
    });
    console.log(`🔍 DEBUG: User answers summary:`, state.userAnswers?.map((answer, index) => ({
      question: index + 1,
      correct: answer.correct,
      userAnswer: answer.userAnswer?.substring(0, 50) + '...',
      correctAnswer: answer.correctAnswer?.substring(0, 50) + '...'
    })));
    
    // Save results (aggregate)
    try {
      await this.saveTestResults(state);
      console.log('✅ Test results saved successfully');
    } catch (e) {
      console.error('❌ Saving test results failed:', e.message);
    }
    
    // CRITICAL FIX: Use correct score - if state.score doesn't match userAnswers, use userAnswers
    const finalScore = (state.score !== correctAnswersFromUserAnswers && correctAnswersFromUserAnswers > 0) 
      ? correctAnswersFromUserAnswers 
      : state.score;
    
    if (finalScore !== state.score) {
      console.log(`🔧 SCORE CORRECTION: Using ${finalScore} instead of ${state.score} based on userAnswers`);
    }
    
    const percentage = Math.round((finalScore / actualTotalQuestions) * 100);
    const feedback = this.generateTestFeedback(percentage, state.userLanguage);
    
    console.log(`🎯 FINAL CORRECTED SCORE: ${finalScore}/${actualTotalQuestions} (${percentage}%)`);
    
    // Update state.score with corrected value
    state.score = finalScore;
    
    console.log(`📋 Test feedback: ${feedback}`);
    console.log(`🔍 DEBUG: Final calculated percentage: ${percentage}% (${state.score}/${actualTotalQuestions})`);
    
    // Try to load next lesson in the same training
    try {
      console.log('🔍 Looking for next lesson after current lesson:', state.lesson?.lesson_id);
      const nextLessonResponse = await this.loadNextLesson(state, userPhone);
      
      if (nextLessonResponse && nextLessonResponse.questionType === 'lesson') {
        console.log('✅ Found next lesson, continuing training sequence');
        
        // Return test results + next lesson
        const continuingText = LanguageTranslator.translate('continuing_next_lesson', state.userLanguage);
        return {
          questionType: 'lesson',
          feedback: `Výsledek testu: ${state.score}/${actualTotalQuestions} (${percentage}%). ${continuingText}`,
          nextQuestion: nextLessonResponse.nextQuestion,
          testResults: { score: state.score, total: actualTotalQuestions, percentage },
        };
      } else {
        console.log('⚠️ No next lesson found, ending training sequence');
      }
    } catch (error) {
      console.error('❌ Error loading next lesson:', error);
    }
    
    // No next lesson found or error occurred - end session
    const trainingCompletedText = LanguageTranslator.translate('training_completed', state.userLanguage);
    const completionResponse = {
      questionType: 'session_complete',
      feedback: `${feedback} Výsledek: ${state.score}/${actualTotalQuestions} (${percentage}%). ${trainingCompletedText}`,
      testResults: { score: state.score, total: actualTotalQuestions, percentage }
    };
    
    console.log('🔚 Returning session_complete response (no more lessons):', {
      questionType: completionResponse.questionType,
      score: state.score,
      total: state.totalQuestions,
      percentage: percentage
    });
    
    return completionResponse;
  }

  static async saveTestResults(state) {
    try {
      const TestResult = require('../models/TestResult');
      const userId = state.lesson?.user_id || null;
      const lessonTitle = state.lesson?.title || null;
      const trainingType = state.lesson?.trainingType || 'lesson_test';
      const sessionId = state.callSid || null;
      const percentage = Math.round((state.score / state.totalQuestions) * 100);

      // Save aggregate summary row
      await TestResult.create({
        userId,
        trainingType,
        lessonTitle,
        questionText: 'TEST SUMMARY',
        userAnswer: `${state.score}/${state.totalQuestions}`,
        aiEvaluation: { percentage },
        sessionId
      });

      console.log('✅ Test results saved (summary)');
    } catch (error) {
      console.error('❌ Error creating TestResult records:', error.message);
    }
  }

  // Handle navigation menu
  static async handleNavigationMenu(userInput, state, userPhone) {
    const navigationCommand = this.checkNavigationCommand(userInput);
    
    if (navigationCommand) {
      return this.handleNavigation(navigationCommand, state, userPhone);
    }
    
    return {
      questionType: 'navigation_menu',
      feedback: 'Prosím, vyberte možnost.',
      nextQuestion: this.getNavigationMenu(state.userLanguage),
    };
  }

  // Load next lesson
  static async loadNextLesson(state, userPhone) { // Uses next lesson after current
    const { getNextLesson, loadTestQuestionsFromDB } = require('./lesson-selector');
    try {
      const currentId = state.lesson?.lesson_id;
      console.log(`🔍 loadNextLesson: Current lesson ID: ${currentId}`);
      console.log(`🔍 loadNextLesson: Current lesson title: ${state.lesson?.title}`);
      
      let nextLessonRecord = null;
      if (currentId) {
        nextLessonRecord = await getNextLesson(currentId);
        console.log(`🔍 loadNextLesson: getNextLesson returned:`, nextLessonRecord ? {
          id: nextLessonRecord.id,
          title: nextLessonRecord.title,
          trainingId: nextLessonRecord.trainingId,
          lesson_number: nextLessonRecord.lesson_number,
          order_in_course: nextLessonRecord.order_in_course
        } : 'null');
      }
      
      if (!nextLessonRecord) {
        console.log('⚠️ No next lesson found - training sequence completed');
        return {
          questionType: 'session_complete',
          feedback: 'Školení bylo úspěšně dokončeno! Gratulujeme!',
          nextQuestion: 'Hovor bude ukončen.'
        };
      }
      
      console.log(`✅ Loading next lesson: ${nextLessonRecord.title} (ID: ${nextLessonRecord.id})`);
      console.log(`🔍 DEBUG: Looking for test with ID ${nextLessonRecord.id} (same as lesson ID)`);
      const questions = await loadTestQuestionsFromDB(nextLessonRecord.id);
      console.log(`📝 Loaded ${questions.length} questions for next lesson`);
      
      if (questions.length === 0) {
        console.log(`❌ WARNING: No test questions found for lesson ${nextLessonRecord.id}`);
        console.log(`❌ This means no test with ID=${nextLessonRecord.id} exists in database`);
        console.log(`❌ User will repeat the lesson instead of taking a test`);
      }
      
      const nextLesson = {
        type: 'lesson',
        lesson_id: nextLessonRecord.id,
        user_id: state.lesson?.user_id || null,
        title: nextLessonRecord.title,
        content: nextLessonRecord.content || nextLessonRecord.description,
        language: state.userLanguage,
        questions
      };
      
      if (nextLesson && nextLesson.type === 'lesson') {
        state.lesson = nextLesson;
        state.currentState = CONVERSATION_STATES.LESSON_PLAYING;
        state.currentQuestionIndex = 0;
        // DON'T reset score and userAnswers - they should persist between tests
        // state.userAnswers = []; // REMOVED - this was clearing test results!
        // state.score = 0; // REMOVED - this was causing the 0/3 bug!
        
        console.log(`🎯 State updated for next lesson: ${nextLesson.title}`);
        
        return {
          questionType: 'lesson',
          feedback: `Pokračujeme další lekcí: ${nextLesson.title}`,
          nextQuestion: this.formatLessonContent(nextLesson),
        };
      } else {
        console.log('❌ Failed to create next lesson object');
        return {
          questionType: 'session_complete',
          feedback: 'Školení bylo dokončeno.',
          nextQuestion: 'Hovor bude ukončen.'
        };
      }
    } catch (error) {
      console.error('❌ Error in loadNextLesson:', error);
      return {
        questionType: 'session_complete',
        feedback: 'Došlo k chybě při načítání další lekce. Školení bude ukončeno.',
        nextQuestion: 'Hovor bude ukončen.'
      };
    }
  }

  // Load previous lesson
  static async loadPreviousLesson(state, userPhone) { // Uses previous lesson before current
    const { getPreviousLesson, loadTestQuestionsFromDB } = require('./lesson-selector');
    try {
      const currentId = state.lesson?.lesson_id;
      let prevLessonRecord = null;
      if (currentId) {
        prevLessonRecord = await getPreviousLesson(currentId);
      }
      if (!prevLessonRecord) {
        return {
          questionType: 'navigation_menu',
          feedback: 'Žádná předchozí lekce není k dispozici.',
          nextQuestion: this.getNavigationMenu(state.userLanguage)
        };
      }
      const questions = await loadTestQuestionsFromDB(prevLessonRecord.id);
      const prevLesson = {
        type: 'lesson',
        lesson_id: prevLessonRecord.id,
        title: prevLessonRecord.title,
        content: prevLessonRecord.content || prevLessonRecord.description,
        language: state.userLanguage,
        questions
      };
      
      if (prevLesson && prevLesson.type === 'lesson') {
        state.lesson = prevLesson;
        state.currentState = CONVERSATION_STATES.LESSON_PLAYING;
        state.currentQuestionIndex = 0;
        state.userAnswers = [];
        state.score = 0;
        
        return {
          questionType: 'lesson',
          feedback: 'Načítám předchozí lekci.',
          nextQuestion: this.formatLessonContent(prevLesson),
        };
      } else {
        return {
          questionType: 'session_complete',
          feedback: 'Žádné předchozí lekce nejsou k dispozici.'
        };
      }
    } catch (error) {
      console.error('❌ Error loading previous lesson:', error);
      return {
        questionType: 'error',
        feedback: 'Nepodařilo se načíst předchozí lekci.'
      };
    }
  }

  // Format lesson content
  static formatLessonContent(lesson) {
    // Remove any markdown formatting and special characters
    let content = lesson.content || lesson.description || 'Praktické školení.';
    
    // Remove markdown headers (#), bold (**), italic (*), lists (-)
    content = content.replace(/#{1,6}\s*/g, ''); // Remove # headers
    content = content.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove **bold**
    content = content.replace(/\*(.*?)\*/g, '$1'); // Remove *italic*
    content = content.replace(/^[-*+]\s+/gm, ''); // Remove list markers
    content = content.replace(/^\s*\d+\.\s+/gm, ''); // Remove numbered lists
    
    // Clean up extra whitespace
    content = content.replace(/\n\s*\n/g, ' '); // Replace multiple newlines with space
    content = content.replace(/\s+/g, ' '); // Replace multiple spaces with single space
    content = content.trim();
    
    // Add automatic transition to test after lesson completion
    const lessonText = `${lesson.title}. ${content}`;
    
    // Add a pause and transition instruction at the end
    return `${lessonText}. [PAUSE]`;
  }

  // Format test question
  static formatTestQuestion(question, language) {
    if (!question) return 'Otázka není k dispozici.';
    
    let formattedQuestion = question.question || 'Otázka';
    
    if (question.options && Array.isArray(question.options)) {
      formattedQuestion += ' Možnosti: ';
      question.options.forEach((option, index) => {
        const letter = String.fromCharCode(65 + index); // A, B, C, D
        formattedQuestion += `${letter}) ${option}. `;
      });
    }
    
    return formattedQuestion;
  }



  // Get navigation menu
  static getNavigationMenu(language) {
    switch (language) {
      case 'en':
        return 'Navigation menu: 1 - Repeat lesson, 2 - Next lesson, 3 - Previous lesson, 4 - End session.';
      case 'de':
        return 'Navigationsmenü: 1 - Lektion wiederholen, 2 - Nächste Lektion, 3 - Vorherige Lektion, 4 - Sitzung beenden.';
      case 'sk':
        return 'Navigačné menu: 1 - Zopakovať lekciu, 2 - Ďalšia lekcia, 3 - Predchádzajúca lekcia, 4 - Ukončiť reláciu.';
      default: // cs
        return 'Navigační menu: 1 - Zopakovat lekci, 2 - Další lekce, 3 - Předchozí lekce, 4 - Ukončit relaci.';
    }
  }

  // Generate test feedback
  static generateTestFeedback(percentage, language) {
    if (percentage >= 90) {
      return 'Výborně! Máte skvělé výsledky.';
    } else if (percentage >= 70) {
      return 'Dobře! Máte dobré výsledky.';
    } else if (percentage >= 50) {
      return 'Průměrně. Zkuste to znovu.';
    } else {
      return 'Potřebujete více procvičit.';
    }
  }

  // Handle lesson phase
  static async handleLessonPhase(userInput, state, userPhone) {
    console.log('📚 Lesson phase - processing');
    
    // Do NOT interpret any user input as a test answer during lesson phase
    // Transition to test happens only via explicit AUTO_START after lesson TTS completes
    
    // Only transition when explicitly triggered after lesson ends (AUTO_START)
    // Lesson automatically ends when Twilio finishes reading the content
    if (userInput !== 'AUTO_START') {
      return {
        questionType: 'lesson',
        feedback: state.lesson.message,
        nextQuestion: state.lesson.content
      };
    }
    console.log('✅ Lesson completed, starting test');
    state.currentState = CONVERSATION_STATES.TEST_ACTIVE;
    state.currentQuestionIndex = 0;
    state.totalQuestions = state.lesson.questions ? state.lesson.questions.length : 0;
    // DON'T reset score here - it should persist from previous test if any
    // state.score = 0; // REMOVED - this was causing the 0/3 bug!
    // state.userAnswers = []; // REMOVED - this was clearing previous answers!
    
    console.log(`🔍 Debug: questions array length = ${state.lesson.questions ? state.lesson.questions.length : 'undefined'}`);
    console.log(`🔍 Debug: totalQuestions = ${state.totalQuestions}`);
    
    if (state.totalQuestions === 0) {
      console.log('⚠️ No questions found, ending session');
      return {
        questionType: 'session_complete',
        feedback: 'Lekce dokončena. Test není k dispozici.'
      };
    }
    
    const firstQuestion = this.formatTestQuestion(state.lesson.questions[0], state.userLanguage);
    console.log(`✅ Starting test with first question: ${firstQuestion.substring(0, 100)}...`);
    console.log(`🔍 DEBUG: Full first question: "${firstQuestion}"`);    
    return {
      questionType: 'test',
      feedback: 'Lekce dokončena. Začínáme test.',
      nextQuestion: firstQuestion
    };
  }

  // Handle test phase with improved answer checking
  static async handleTestPhase(userInput, state, userPhone) {
    // Ensure totalQuestions is set (for robustness)
    if (!state.totalQuestions && state.lesson?.questions) {
      state.totalQuestions = state.lesson.questions.length;
      console.log(`🔍 Setting totalQuestions to ${state.totalQuestions}`);
    }
    
    console.log(`🧪 Test phase - Question ${state.currentQuestionIndex + 1}/${state.totalQuestions}`);
    console.log(`🔍 Debug: currentQuestionIndex=${state.currentQuestionIndex}, totalQuestions=${state.totalQuestions}`);
    console.log(`🔍 DEBUG: Current state before processing:`, {
      score: state.score,
      totalQuestions: state.totalQuestions,
      userAnswersLength: state.userAnswers ? state.userAnswers.length : 0,
      currentQuestionIndex: state.currentQuestionIndex
    });
    
    // Process test question
    const currentQuestion = state.lesson.questions[state.currentQuestionIndex];
    console.log(`🔍 DEBUG: Current question:`, {
      question: currentQuestion.question?.substring(0, 100) + '...',
      options: currentQuestion.options,
      correctAnswer: currentQuestion.correctAnswer,
      correctAnswerText: currentQuestion.options[currentQuestion.correctAnswer]
    });
    
    const isCorrect = this.checkTestAnswer(userInput, currentQuestion, state.userLanguage);
    if (isCorrect === 'ambiguous') {
      console.log('⚠️ Ambiguous user input. Repeating the question.');
      const nextQuestion = this.formatTestQuestion(currentQuestion, state.userLanguage);
              return {
          questionType: 'test',
          feedback: 'Prosím zopakujte jen jednu volbu. Řekněte například A, B, C, D nebo samotnou správnou odpověď.',
          nextQuestion: nextQuestion
        };
    }
    console.log(`🔍 DEBUG: Answer evaluation:`, {
      userInput: userInput,
      isCorrect: isCorrect,
      expectedAnswer: currentQuestion.options[currentQuestion.correctAnswer]
    });
    
    if (isCorrect) {
      state.score++;
      console.log(`✅ Correct answer! Score: ${state.score}/${state.totalQuestions}`);
    } else {
      console.log(`❌ Wrong answer. Score: ${state.score}/${state.totalQuestions}`);
    }
    
    state.userAnswers.push({
      question: currentQuestion.question,
      userAnswer: userInput,
      correct: isCorrect,
      correctAnswer: currentQuestion.options[currentQuestion.correctAnswer]
    });
    
    console.log(`🔍 DEBUG: After processing answer:`, {
      score: state.score,
      totalQuestions: state.totalQuestions,
      userAnswersLength: state.userAnswers.length,
      currentQuestionIndex: state.currentQuestionIndex
    });
    
    // Save each answer immediately to database (aligned with TestResult schema)
    try {
      const TestResult = require('../models/TestResult');
      const userId = state.lesson?.user_id || null;
      const lessonTitle = state.lesson?.title || null;
      const trainingType = state.lesson?.trainingType || 'lesson_test';
      
      console.log(`🔍 DEBUG: About to save TestResult - userId: ${userId}, lessonTitle: ${lessonTitle}, hasLesson: ${!!state.lesson}`);
      if (state.lesson) {
        console.log(`🔍 DEBUG: Lesson object keys:`, Object.keys(state.lesson));
        console.log(`🔍 DEBUG: Lesson user_id:`, state.lesson.user_id);
      }

      await TestResult.create({
        userId,
        trainingType,
        lessonTitle,
        questionText: currentQuestion.question,
        userAnswer: userInput,
        recordingUrl: state.recordingUrl || null,
        recordingDuration: state.recordingDuration || null,
        sessionId: state.callSid || null,
        aiEvaluation: {
          isCorrect: isCorrect,
          question: currentQuestion.question,
          userAnswer: userInput,
          correctAnswer: currentQuestion.options[currentQuestion.correctAnswer],
          timestamp: new Date().toISOString()
        }
      });
      state.savedIndividually = true;
      console.log(`💾 Answer saved to database: ${isCorrect ? 'CORRECT' : 'WRONG'}`);
      console.log(`🔍 DEBUG: Saved to TestResult - userId: ${userId}, sessionId: ${state.callSid}, question: "${currentQuestion.question.substring(0, 50)}..."`);
    } catch (error) {
      console.error('❌ Error saving answer to database:', error.message);
      console.error('❌ Full error:', error);
    }
    
    state.currentQuestionIndex++;
    
    console.log(`🔍 DEBUG: After increment - currentQuestionIndex=${state.currentQuestionIndex}, totalQuestions=${state.totalQuestions}`);
    console.log(`🔍 DEBUG: Test completion check: ${state.currentQuestionIndex} < ${state.totalQuestions} = ${state.currentQuestionIndex < state.totalQuestions}`);
    
    // Get next question or complete test
    if (state.currentQuestionIndex < state.totalQuestions) {
      console.log(`✅ Moving to next question (${state.currentQuestionIndex + 1}/${state.totalQuestions})`);
      const nextQuestion = this.formatTestQuestion(state.lesson.questions[state.currentQuestionIndex], state.userLanguage);
      
      console.log(`📤 Returning next question response: feedback="${isCorrect ? 'Správně!' : 'Špatně.'}", questionLength=${nextQuestion.length}`);
      return {
        questionType: 'test',
        feedback: isCorrect ? 'Správně!' : 'Špatně.',
        nextQuestion: nextQuestion
      };
    } else {
      console.log(`🎓 Test completed! Moving to handleTestCompleted`);
      state.currentState = CONVERSATION_STATES.TEST_COMPLETED;
      return this.handleTestCompleted(userInput, state, userPhone);
    }
  }

  // Enhanced test answer checking with fuzzy matching - supports multiple question types
  static checkTestAnswer(userInput, question, userLanguage) {
    if (!question) {
      console.log('❌ No question provided');
      return false;
    }
    
    // Check if question has valid structure for different types
    const hasValidCorrectAnswer = question.correctAnswer !== undefined && question.correctAnswer !== null;
    if (!hasValidCorrectAnswer) {
      console.log('❌ Question missing correctAnswer:', question);
      return false;
    }
    
    const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanInput = normalize(userInput);

    // Ambiguity detection: if user lists many options/keywords, ask to repeat
    const ambiguityKeywords = ['a','b','c','d','jedna','dva','tri','ctyri','mozek','plice','zaludek','jatra','srdce','sto','dveste','sest','206','365','52','www','http','https','one','two','three','four','eins','zwei','drei','vier','uno','dos','tres','cuatro','un','deux','trois','quatre'];
    const distinctHits = new Set();
    for (const kw of ambiguityKeywords) {
      if (cleanInput.includes(kw)) distinctHits.add(kw);
    }
    if (distinctHits.size >= 6 || cleanInput.split(' ').length > 20) {
      console.log('⚠️ Ambiguous input detected (likely full vocabulary list). Will reprompt.');
      return 'ambiguous';
    }
    
    // Determine target language for evaluation (answers are always in the user's language)
    const targetLanguage = userLanguage || (LanguageTranslator && LanguageTranslator.detectLanguage ? LanguageTranslator.detectLanguage(userInput) : 'cs') || 'cs';
    console.log(`🌍 DEBUG: Using target language for evaluation: ${targetLanguage}`);
    
    console.log(`🔍 DEBUG: Question type: ${question.type || 'multiple_choice'}`);
    console.log(`🔍 DEBUG: Raw input: "${userInput}"`);
    console.log(`🔍 DEBUG: Normalized input: "${cleanInput}"`);
    console.log(`🔍 DEBUG: Question: "${question.question}"`);
    console.log(`🔍 DEBUG: Options: [${question.options?.join(', ')}]`);
    console.log(`🔍 DEBUG: Correct answer index: ${question.correctAnswer}`);
    console.log(`🔍 DEBUG: Correct answer text: "${question.options?.[question.correctAnswer]}"`);
    
    // Handle different question types
    const result = (() => {
    switch (question.type) {
      case 'free_text':
        return this.checkFreeTextAnswer(cleanInput, question);
      case 'fill_in_blank':
        return this.checkFillInBlankAnswer(cleanInput, question);
      case 'matching':
        return this.checkMatchingAnswer(cleanInput, question);
      case 'multiple_choice':
      default:
          // If user enumerates many options, reprompt instead of marking wrong
          const mcResult = this.checkMultipleChoiceAnswer(cleanInput, question, targetLanguage);
          if (mcResult === 'ambiguous') return 'ambiguous';
          return mcResult;
      }
    })();
    
    if (result === 'ambiguous') {
      console.log('⚠️ ANSWER EVALUATION RESULT: AMBIGUOUS');
      return 'ambiguous';
    }
    
    console.log(`🎯 ANSWER EVALUATION RESULT: ${result ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`🎯 User said: "${userInput}" -> Expected: "${question.options?.[question.correctAnswer]}"`);
    
    return result;
  }

  // Check multiple choice answer
  static checkMultipleChoiceAnswer(cleanInput, question, targetLanguage = 'cs') {
    console.log(`🔍 DEBUG: Question structure:`, {
      hasOptions: !!question.options,
      optionsLength: question.options?.length,
      correctAnswerIndex: question.correctAnswer,
      correctAnswerType: typeof question.correctAnswer,
      options: question.options
    });
    
    // Define normalize function locally (handles strings and numbers)
    const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
    const correctAnswer = question.options?.[question.correctAnswer];
    
    console.log(`🔍 DEBUG: Normalized input: "${cleanInput}"`);
    console.log(`🔍 DEBUG: Expected answer: "${correctAnswer}"`);
    console.log(`🔍 DEBUG: CorrectAnswer index: ${question.correctAnswer}, Options: [${question.options?.join(', ')}]`);
    
    if (!correctAnswer) return false;
    
    console.log(`🔍 Checking answer: "${cleanInput}" against "${correctAnswer}"`);
    console.log(`🔍 Question options: ${question.options.join(', ')}`);
    console.log(`🔍 Correct answer index: ${question.correctAnswer}`);

    // Tokenize for strict matching
    const tokens = cleanInput.split(' ').map(t => t.replace(/[^a-z0-9]/g, '')).filter(Boolean);
    const tokensSet = new Set(tokens);
    
    // Levenshtein distance function
    const levenshtein = (a, b) => {
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;
      const matrix = Array(b.length + 1).fill().map(() => Array(a.length + 1).fill(0));
      for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
      for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          matrix[j][i] = Math.min(
            matrix[j-1][i] + 1,
            matrix[j][i-1] + 1,
            matrix[j-1][i-1] + (a[i-1] === b[j-1] ? 0 : 1)
          );
        }
      }
      return matrix[b.length][a.length];
    };
    
    // Exact match (diacritics-insensitive)
    if (cleanInput.includes(normalize(correctAnswer))) {
      console.log('✅ Exact match found');
      return true;
    }
    
    // Translation-assisted match: translate correct answer into user's language
    try {
      if (LanguageTranslator && typeof LanguageTranslator.translate === 'function') {
        const translatedCorrect = normalize(LanguageTranslator.translate(correctAnswer, targetLanguage));
        if (translatedCorrect && translatedCorrect.length > 0 && cleanInput.includes(translatedCorrect)) {
          console.log('✅ Translation-assisted exact match found');
      return true;
    }
      }
    } catch (e) {
      console.log('⚠️ Translation check skipped due to error:', e.message);
    }
    
    // Letter token match (A, B, C, D)
    const correctLetter = String.fromCharCode(97 + question.correctAnswer); // a,b,c,d
    if (tokensSet.has(correctLetter)) {
      console.log('✅ Letter token match found');
      return true;
    }
    
    // Number token match with multilingual synonyms
    const correctNumber = question.correctAnswer + 1;
    const numberSynonyms = {
      1: ['1','jedna','prvni','one','eins','uno','un','yi'],
      2: ['2','dva','druha','two','zwei','dos','deux','er'],
      3: ['3','tri','treti','three','drei','tres','trois','san','tři'],
      4: ['4','ctyri','ctvrta','four','vier','cuatro','quatre','si','čtyři']
    };
    const numberHit = (numberSynonyms[correctNumber] || []).some(w => tokensSet.has(normalize(w)));
    if (tokensSet.has(String(correctNumber)) || numberHit) {
      console.log('✅ Number/word token match found');
            return true;
    }
    
    // Czech number words (token)
    const czechNumbers = ['jedna', 'dva', 'tri', 'ctyri'];
    if (tokensSet.has(czechNumbers[question.correctAnswer])) {
      console.log('✅ Czech number token match found');
      return true;
    }
    
    // Specific phrase synonyms across languages for common terms (minimal set)
    const synonymMap = {
      'plice': ['plice','pľuca','lungs','lungen','pulmones','poumons'],
      'mozek': ['mozek','brain','gehirn','cerebro','cerveau'],
      'zaludek': ['zaludek','stomach','magen','estomago','estomac'],
      'srdce': ['srdce','heart','herz','corazon','coeur']
    };
    const correctKey = normalize(correctAnswer);
    for (const [key, synonyms] of Object.entries(synonymMap)) {
      if (correctKey.includes(key)) {
        if (synonyms.some(s => tokensSet.has(normalize(s)) || cleanInput.includes(normalize(s)))) {
          console.log('✅ Synonym match found');
          return true;
        }
      }
    }
    
    // Fuzzy match: allow small edit distance for short answers
    const distance = levenshtein(cleanInput, normalize(correctAnswer));
    const maxAllowed = Math.max(1, Math.floor(correctAnswer.length * 0.2));
    if (distance <= maxAllowed && correctAnswer.length >= 4) {
      console.log('✅ Fuzzy match within threshold');
      return true;
    }
    
    return false;
  }

  // Check free text answer using key words and semantic matching
  static checkFreeTextAnswer(cleanInput, question) {
    const correctAnswer = question.correctAnswer;
    const keyWords = question.keyWords || [];
    
    console.log(`🔍 DEBUG: Free text - Expected: "${correctAnswer}"`);
    console.log(`🔍 DEBUG: Free text - Key words: [${keyWords.join(', ')}]`);
    
    const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const normalizedCorrect = normalize(correctAnswer);
    
    // Levenshtein distance for similarity
    const levenshtein = (a, b) => {
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;
      const matrix = Array(b.length + 1).fill().map(() => Array(a.length + 1).fill(0));
      for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
      for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          matrix[j][i] = Math.min(
            matrix[j-1][i] + 1,
            matrix[j][i-1] + 1,
            matrix[j-1][i-1] + (a[i-1] === b[j-1] ? 0 : 1)
          );
        }
      }
      return matrix[b.length][a.length];
    };
    
    // Check direct similarity with correct answer
    const distance = levenshtein(cleanInput, normalizedCorrect);
    const similarity = 1 - (distance / Math.max(cleanInput.length, normalizedCorrect.length));
    
    if (similarity >= 0.6) {
      console.log(`✅ Free text: High similarity (${Math.round(similarity * 100)}%)`);
      return true;
    }
    
    // Check key words presence
    if (keyWords.length > 0) {
      let keyWordMatches = 0;
      for (const keyWord of keyWords) {
        const normalizedKeyWord = normalize(keyWord);
        if (cleanInput.includes(normalizedKeyWord)) {
          keyWordMatches++;
        }
      }
      
      const keyWordScore = keyWordMatches / keyWords.length;
      if (keyWordScore >= 0.5) {
        console.log(`✅ Free text: Key words match (${Math.round(keyWordScore * 100)}%)`);
        return true;
      }
    }
    
    console.log(`❌ Free text: No match (similarity: ${Math.round(similarity * 100)}%)`);
    return false;
  }

  // Check fill-in-blank answer
  static checkFillInBlankAnswer(cleanInput, question) {
    const correctAnswer = question.correctAnswer;
    const alternatives = question.alternatives || [];
    
    console.log(`🔍 DEBUG: Fill-in-blank - Expected: "${correctAnswer}"`);
    console.log(`🔍 DEBUG: Fill-in-blank - Alternatives: [${alternatives.join(', ')}]`);
    
    const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const normalizedCorrect = normalize(correctAnswer);
    
    // Check exact match with correct answer
    if (cleanInput === normalizedCorrect) {
      console.log('✅ Fill-in-blank: Exact match');
      return true;
    }
    
    // Check alternatives
    for (const alt of alternatives) {
      const normalizedAlt = normalize(alt);
      if (cleanInput === normalizedAlt) {
        console.log('✅ Fill-in-blank: Alternative match');
        return true;
      }
    }
    
    // Check partial match (70% similarity)
    const levenshtein = (a, b) => {
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;
      const matrix = Array(b.length + 1).fill().map(() => Array(a.length + 1).fill(0));
      for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
      for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          matrix[j][i] = Math.min(
            matrix[j-1][i] + 1,
            matrix[j][i-1] + 1,
            matrix[j-1][i-1] + (a[i-1] === b[j-1] ? 0 : 1)
          );
        }
      }
      return matrix[b.length][a.length];
    };
    
    const distance = levenshtein(cleanInput, normalizedCorrect);
    const similarity = 1 - (distance / Math.max(cleanInput.length, normalizedCorrect.length));
    
    if (similarity >= 0.7) {
      console.log(`✅ Fill-in-blank: Partial match (${Math.round(similarity * 100)}%)`);
      return true;
    }
    
    console.log(`❌ Fill-in-blank: No match (similarity: ${Math.round(similarity * 100)}%)`);
    return false;
  }

  // Check matching answer (simplified - expects term or definition)
  static checkMatchingAnswer(cleanInput, question) {
    const pairs = question.pairs || [];
    
    console.log(`🔍 DEBUG: Matching - Pairs: ${pairs.length}`);
    
    const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // For voice input, we check if user mentioned any term or definition
    for (const pair of pairs) {
      const normalizedTerm = normalize(pair.term);
      const normalizedDef = normalize(pair.definition);
      
      if (cleanInput.includes(normalizedTerm) || cleanInput.includes(normalizedDef)) {
        console.log(`✅ Matching: Found term/definition match`);
        return true;
      }
    }
    
    console.log(`❌ Matching: No term/definition found`);
    return false;
  }

  // Update recording info
  static updateRecordingInfo(callSid, recordingUrl, recordingDuration) {
    const state = this.getState(callSid);
    if (state) {
      state.recordingUrl = recordingUrl;
      state.recordingDuration = recordingDuration;
    }
  }
}

module.exports = { VoiceNavigationManager, CONVERSATION_STATES, NAVIGATION_COMMANDS }; 