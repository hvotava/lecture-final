const { LessonSession, Lesson, User, Test, TestResult } = require('../models');

class AITutorService {
  constructor() {
    this.activeSessions = new Map(); // sessionId -> session data
  }

  // Vytvoření nové lekce session
  async startLessonSession(userId, lessonId, sessionId) {
    try {
      console.log(`🎓 [${sessionId}] Starting lesson session for user ${userId}, lesson ${lessonId}`);
      
      // Načtení lekce z databáze
      const lesson = await Lesson.findByPk(lessonId);
      if (!lesson) {
        throw new Error(`Lesson with ID ${lessonId} not found`);
      }

      // Odhad délky lekce na základě obsahu
      const estimatedDuration = this.estimateLessonDuration(lesson.content);
      
      // Vytvoření session v databázi
      const lessonSession = await LessonSession.create({
        userId,
        lessonId,
        sessionId,
        lessonTitle: lesson.title,
        status: 'started',
        currentPhase: 'introduction',
        estimatedDuration,
        contentSegments: this.segmentContent(lesson.content),
        currentSegment: 0
      });

      // Uložení do active sessions pro rychlý přístup
      const sessionData = {
        ...lessonSession.dataValues,
        lesson,
        testQuestions: null,
        currentQuestionIndex: 0,
        userTestAnswers: [],
        interactionHistory: []
      };
      
      this.activeSessions.set(sessionId, sessionData);
      
      console.log(`✅ [${sessionId}] Lesson session created: "${lesson.title}" (${estimatedDuration} min)`);
      
      return {
        success: true,
        sessionData,
        introductionMessage: this.generateIntroductionMessage(lesson, estimatedDuration)
      };
      
    } catch (error) {
      console.error(`❌ [${sessionId}] Error starting lesson session:`, error);
      throw error;
    }
  }

  // Zpracování zprávy od uživatele
  async processUserMessage(sessionId, userMessage, userId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      console.log(`💬 [${sessionId}] Processing user message in phase: ${session.currentPhase}`);
      
      // Aktualizace interaction count
      session.interactionCount++;
      
      let response;
      
      switch (session.currentPhase) {
        case 'introduction':
          response = await this.handleIntroductionPhase(session, userMessage);
          break;
        case 'content':
          response = await this.handleContentPhase(session, userMessage);
          break;
        case 'test':
          response = await this.handleTestPhase(session, userMessage);
          break;
        case 'evaluation':
          response = await this.handleEvaluationPhase(session, userMessage);
          break;
        default:
          response = {
            message: "Omluv se, nevím v jaké fázi lekce se nacházíme. Můžeme začít znovu?",
            phase: session.currentPhase
          };
      }

      // Uložení aktualizované session
      await this.updateSession(session);
      
      return response;
      
    } catch (error) {
      console.error(`❌ [${sessionId}] Error processing user message:`, error);
      throw error;
    }
  }

  // Generování úvodní zprávy
  generateIntroductionMessage(lesson, estimatedDuration) {
    const goals = this.extractLessonGoals(lesson.content);
    const goalsText = goals.length > 0 ? goals.map((goal, i) => `${i + 1}. ${goal}`).join('\n') : 'Naučíte se nové užitečné věci.';
    
    return `Ahoj! Vítej v lekci "${lesson.title}".

📚 **Hlavní cíle této lekce:**
${goalsText}

⏱️ **Odhadovaná délka:** ${estimatedDuration} minut

**Jak to bude probíhat:**
1. Projdeme si obsah po částech
2. U každé části se tě zeptám na kontrolní otázku
3. Na konci uděláme krátký test
4. Vyhodnotíme výsledky a doporučím další kroky

Jsi připraven začít? Řekni "ano" nebo "začněme"!`;
  }

  // Zpracování úvodní fáze
  async handleIntroductionPhase(session, userMessage) {
    const normalizedMessage = userMessage.toLowerCase().trim();
    
    if (normalizedMessage.includes('ano') || normalizedMessage.includes('začněme') || 
        normalizedMessage.includes('připraven') || normalizedMessage.includes('začneme')) {
      
      // Přechod na fázi obsahu
      session.currentPhase = 'content';
      session.status = 'in_progress';
      
      const firstSegment = session.contentSegments[0];
      return {
        message: this.generateSegmentMessage(firstSegment, 0, session.contentSegments.length),
        phase: 'content',
        action: 'start_content'
      };
    } else {
      return {
        message: "Rozumím. Pokud máš nějaké otázky k lekci, klidně se zeptej. Až budeš připraven začít, řekni 'ano' nebo 'začněme'.",
        phase: 'introduction'
      };
    }
  }

  // Zpracování fáze obsahu
  async handleContentPhase(session, userMessage) {
    const currentSegmentIndex = session.currentSegment;
    const totalSegments = session.contentSegments.length;
    
    // Pokud je to odpověď na kontrolní otázku
    if (session.waitingForAnswer) {
      session.waitingForAnswer = false;
      session.questionsAnswered++;
      
      // Jednoduché vyhodnocení odpovědi (ano/ne, A/B)
      const isCorrect = this.evaluateControlAnswer(userMessage, session.expectedAnswer);
      const feedback = isCorrect ? "Výborně! " : "V pořádku. ";
      
      // Přechod na další segment nebo test
      if (currentSegmentIndex + 1 < totalSegments) {
        session.currentSegment++;
        const nextSegment = session.contentSegments[session.currentSegment];
        
        return {
          message: feedback + this.generateSegmentMessage(nextSegment, session.currentSegment, totalSegments),
          phase: 'content'
        };
      } else {
        // Konec obsahu, přechod na test
        session.currentPhase = 'test';
        session.status = 'testing';
        
        const testQuestions = await this.generateTestQuestions(session.lesson);
        session.testQuestions = testQuestions;
        session.currentQuestionIndex = 0;
        session.userTestAnswers = [];
        
        return {
          message: feedback + `Skvěle! Prošli jsme si celý obsah lekce. Teď si otestujeme, co jsi se naučil.

📝 **Test bude mít ${testQuestions.length} otázek**. Odpovědi si zapamatuji a vyhodnotím až na konci.

Jsi připraven na první otázku? Řekni "ano".`,
          phase: 'test',
          action: 'prepare_test'
        };
      }
    } else {
      // Odpověď mimo kontrolní otázku - možná dotaz k obsahu
      if (this.isQuestionAboutContent(userMessage)) {
        return {
          message: `To je dobrá otázka! ${this.generateContentAnswer(userMessage, session.lesson.content)} 

Vrátíme se teď k naší lekci. ${this.generateControlQuestion(session.contentSegments[currentSegmentIndex])}`,
          phase: 'content'
        };
      } else {
        // Pokračování v segmentu
        return {
          message: this.generateControlQuestion(session.contentSegments[currentSegmentIndex]),
          phase: 'content'
        };
      }
    }
  }

  // Zpracování testovací fáze
  async handleTestPhase(session, userMessage) {
    if (!session.testQuestions || session.testQuestions.length === 0) {
      return {
        message: "Omluv se, něco se pokazilo s přípravou testu. Zkusíme to znovu.",
        phase: 'test',
        action: 'error'
      };
    }

    const normalizedMessage = userMessage.toLowerCase().trim();
    
    // Pokud čekáme na potvrzení začátku testu
    if (session.currentQuestionIndex === 0 && session.userTestAnswers.length === 0) {
      if (normalizedMessage.includes('ano') || normalizedMessage.includes('připraven')) {
        const firstQuestion = session.testQuestions[0];
        session.questionsAsked++;
        
        return {
          message: `**Otázka 1 z ${session.testQuestions.length}:**

${firstQuestion.question}

${this.formatQuestionOptions(firstQuestion)}`,
          phase: 'test',
          action: 'ask_question'
        };
      } else {
        return {
          message: "Rozumím. Až budeš připraven na test, řekni 'ano'.",
          phase: 'test'
        };
      }
    }

    // Zpracování odpovědi na testovou otázku
    const currentQuestion = session.testQuestions[session.currentQuestionIndex];
    const userAnswer = this.parseUserAnswer(userMessage, currentQuestion);
    
    // Uložení odpovědi
    session.userTestAnswers.push({
      questionIndex: session.currentQuestionIndex,
      question: currentQuestion.question,
      userAnswer: userAnswer,
      correctAnswer: currentQuestion.correct,
      timestamp: new Date()
    });

    // Přechod na další otázku
    session.currentQuestionIndex++;
    
    if (session.currentQuestionIndex < session.testQuestions.length) {
      const nextQuestion = session.testQuestions[session.currentQuestionIndex];
      session.questionsAsked++;
      
      return {
        message: `**Otázka ${session.currentQuestionIndex + 1} z ${session.testQuestions.length}:**

${nextQuestion.question}

${this.formatQuestionOptions(nextQuestion)}`,
        phase: 'test',
        action: 'ask_question'
      };
    } else {
      // Test dokončen, přechod na vyhodnocení
      session.currentPhase = 'evaluation';
      const results = await this.evaluateTestResults(session);
      
      return {
        message: await this.generateTestResultsMessage(results, session),
        phase: 'evaluation',
        action: 'show_results',
        results
      };
    }
  }

  // Zpracování fáze vyhodnocení
  async handleEvaluationPhase(session, userMessage) {
    const normalizedMessage = userMessage.toLowerCase().trim();
    
    if (normalizedMessage.includes('další') || normalizedMessage.includes('pokračovat')) {
      const recommendations = await this.generateRecommendations(session);
      
      return {
        message: recommendations,
        phase: 'completed',
        action: 'show_recommendations'
      };
    } else {
      return {
        message: "Máš nějaké otázky k výsledkům? Nebo chceš doporučení dalších lekcí? Řekni 'další lekce'.",
        phase: 'evaluation'
      };
    }
  }

  // Odhad délky lekce
  estimateLessonDuration(content) {
    const wordCount = content.split(' ').length;
    // Odhad: 150 slov za minutu čtení + čas na test
    const readingTime = Math.ceil(wordCount / 150);
    const testTime = 5; // 5 minut na test
    return Math.max(readingTime + testTime, 10); // minimálně 10 minut
  }

  // Rozdělení obsahu na segmenty
  segmentContent(content) {
    // Rozdělení podle odstavců nebo sekcí
    const sections = content.split(/\n\s*\n|\n#+\s/).filter(section => section.trim().length > 0);
    
    return sections.map((section, index) => ({
      index,
      content: section.trim(),
      summary: this.generateSegmentSummary(section),
      controlQuestion: this.generateControlQuestion(section)
    }));
  }

  // Generování zprávy pro segment
  generateSegmentMessage(segment, currentIndex, totalSegments) {
    return `**Část ${currentIndex + 1} z ${totalSegments}:**

${segment.summary}

${segment.controlQuestion}`;
  }

  // Generování kontrolní otázky pro segment
  generateControlQuestion(segment) {
    // Jednoduché ano/ne nebo A/B otázky
    const questions = [
      "Je ti to jasné? (ano/ne)",
      "Rozumíš tomuto konceptu? (ano/ne)", 
      "Máš k tomu nějaké otázky? (ano/ne)",
      "Chceš pokračovat na další část? (ano/ne)"
    ];
    
    return questions[Math.floor(Math.random() * questions.length)];
  }

  // Generování testových otázek
  async generateTestQuestions(lesson) {
    // Pro jednoduchost použijeme předpřipravené otázky z lesson.questions nebo vygenerujeme základní
    if (lesson.questions && lesson.questions.length > 0) {
      return lesson.questions.slice(0, 5).map((q, index) => ({
        id: index,
        question: q.question_text || q.question,
        options: q.options || ['A) Ano', 'B) Ne'],
        correct: q.correct_answer || q.expected_answer || 'A',
        type: q.question_type || 'multiple_choice'
      }));
    }

    // Fallback - základní otázky
    return [
      {
        id: 0,
        question: `Co bylo hlavním tématem lekce "${lesson.title}"?`,
        options: ['A) Základní koncepty', 'B) Pokročilé techniky', 'C) Praktické aplikace'],
        correct: 'A',
        type: 'multiple_choice'
      },
      {
        id: 1,
        question: 'Cítíš, že jsi pochopil hlavní body této lekce?',
        options: ['A) Ano, rozumím všemu', 'B) Částečně', 'C) Ne, potřebuji více vysvětlení'],
        correct: 'A',
        type: 'multiple_choice'
      }
    ];
  }

  // Vyhodnocení testových výsledků
  async evaluateTestResults(session) {
    const { userTestAnswers, testQuestions, userId, lessonId, sessionId } = session;
    
    let correctCount = 0;
    const detailedResults = [];

    userTestAnswers.forEach((answer, index) => {
      const question = testQuestions[index];
      const isCorrect = answer.userAnswer === question.correct;
      
      if (isCorrect) correctCount++;
      
      detailedResults.push({
        question: question.question,
        userAnswer: answer.userAnswer,
        correctAnswer: question.correct,
        isCorrect,
        explanation: this.generateExplanation(question, isCorrect)
      });
    });

    const totalQuestions = testQuestions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    
    // Uložení výsledků do databáze
    await TestResult.create({
      userId,
      lessonId,
      testName: `${session.lessonTitle} - Test`,
      score: correctCount,
      totalQuestions,
      correctAnswers: correctCount,
      percentage,
      answers: userTestAnswers,
      duration: Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
    });

    // Aktualizace session
    session.correctAnswers = correctCount;
    session.totalQuestions = totalQuestions;
    session.testScore = correctCount;
    session.testPercentage = percentage;
    session.status = 'completed';
    session.completedAt = new Date();

    return {
      correctCount,
      totalQuestions,
      percentage,
      detailedResults,
      passed: percentage >= 70
    };
  }

  // Generování zprávy s výsledky testu
  async generateTestResultsMessage(results, session) {
    const { correctCount, totalQuestions, percentage, detailedResults, passed } = results;
    
    let message = `🎉 **Výsledky testu:**

📊 **Tvoje skóre:** ${correctCount}/${totalQuestions} bodů (${percentage}%)

`;

    if (passed) {
      message += "✅ **Gratuluju!** Test jsi zvládl skvěle!\n\n";
    } else {
      message += "📚 **Není to špatné!** Můžeš si lekci zopakovat pro lepší výsledek.\n\n";
    }

    message += "**Detailní vyhodnocení:**\n";
    
    detailedResults.forEach((result, index) => {
      const icon = result.isCorrect ? "✅" : "❌";
      message += `${icon} **Otázka ${index + 1}:** ${result.isCorrect ? 'Správně' : 'Špatně'}\n`;
      
      if (!result.isCorrect) {
        message += `   *Správná odpověď byla: ${result.correctAnswer}*\n`;
        message += `   *${result.explanation}*\n`;
      }
      message += "\n";
    });

    message += "Chceš doporučení dalších lekcí? Řekni 'další lekce'.";

    return message;
  }

  // Generování doporučení
  async generateRecommendations(session) {
    const { testPercentage } = session;
    
    let recommendations = "🎯 **Doporučení dalšího postupu:**\n\n";
    
    if (testPercentage >= 90) {
      recommendations += "🌟 Výborný výsledek! Můžeš pokračovat na pokročilejší lekce:\n";
      recommendations += "• Pokročilé techniky\n";
      recommendations += "• Praktické aplikace\n";
      recommendations += "• Specializované témata\n";
    } else if (testPercentage >= 70) {
      recommendations += "👍 Dobrý výsledek! Doporučuji:\n";
      recommendations += "• Krátké opakování této lekce\n";
      recommendations += "• Pokračování na související témata\n";
      recommendations += "• Procvičování praktických příkladů\n";
    } else {
      recommendations += "📖 Doporučuji si tuto lekci zopakovat:\n";
      recommendations += "• Projdi si obsah znovu pomaleji\n";
      recommendations += "• Zaměř se na hlavní koncepty\n";
      recommendations += "• Zkus test znovu za pár dní\n";
    }

    recommendations += "\nChceš začít další lekci hned teď nebo se vrátíš později?";
    
    return recommendations;
  }

  // Pomocné metody
  extractLessonGoals(content) {
    // Extrakce cílů z obsahu lekce
    const goals = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      if (line.includes('cíl') || line.includes('naučí') || line.includes('pochopí')) {
        goals.push(line.trim().replace(/^[#-*]\s*/, ''));
      }
    });

    return goals.slice(0, 3); // max 3 cíle
  }

  generateSegmentSummary(content) {
    // Zjednodušený summary - první věta nebo první 100 znaků
    const sentences = content.split('.').filter(s => s.trim().length > 10);
    if (sentences.length > 0) {
      return sentences[0].trim() + '.';
    }
    return content.substring(0, 100).trim() + '...';
  }

  evaluateControlAnswer(userMessage, expectedAnswer) {
    const normalized = userMessage.toLowerCase().trim();
    return normalized.includes('ano') || normalized.includes('rozumím') || normalized.includes('jasné');
  }

  isQuestionAboutContent(message) {
    const questionWords = ['co', 'jak', 'proč', 'kdy', 'kde', 'kdo', '?'];
    const normalized = message.toLowerCase();
    return questionWords.some(word => normalized.includes(word));
  }

  generateContentAnswer(question, content) {
    // Jednoduchá odpověď na základě obsahu
    return "Na základě obsahu lekce bych řekl... (toto by v reálné implementaci používalo AI pro generování odpovědi)";
  }

  formatQuestionOptions(question) {
    if (question.options && question.options.length > 0) {
      return question.options.join('\n');
    }
    return 'A) Ano\nB) Ne';
  }

  parseUserAnswer(userMessage, question) {
    const normalized = userMessage.toLowerCase().trim();
    
    // Rozpoznání A/B/C odpovědí
    if (normalized.includes('a)') || normalized.startsWith('a')) return 'A';
    if (normalized.includes('b)') || normalized.startsWith('b')) return 'B';
    if (normalized.includes('c)') || normalized.startsWith('c')) return 'C';
    
    // Fallback
    return normalized.charAt(0).toUpperCase();
  }

  generateExplanation(question, isCorrect) {
    if (isCorrect) {
      return "Správně! Dobře jsi pochopil tuto část lekce.";
    }
    return "Tato část by chtěla ještě trochu pozornosti. Zkus si ji projít znovu.";
  }

  // Aktualizace session v databázi
  async updateSession(session) {
    await LessonSession.update({
      status: session.status,
      currentPhase: session.currentPhase,
      currentSegment: session.currentSegment,
      interactionCount: session.interactionCount,
      questionsAsked: session.questionsAsked,
      questionsAnswered: session.questionsAnswered,
      correctAnswers: session.correctAnswers,
      totalQuestions: session.totalQuestions,
      testScore: session.testScore,
      testPercentage: session.testPercentage,
      completedAt: session.completedAt,
      duration: session.completedAt ? 
        Math.floor((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000) : null
    }, {
      where: { sessionId: session.sessionId }
    });
  }

  // Ukončení session
  async endSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'abandoned';
      session.completedAt = new Date();
      await this.updateSession(session);
      this.activeSessions.delete(sessionId);
    }
  }

  // Získání session
  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }
}

// Singleton instance
const aiTutorService = new AITutorService();

module.exports = aiTutorService; 