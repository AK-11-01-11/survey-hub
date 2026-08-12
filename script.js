// ==================================================
// 1. FIREBASE INITIALIZATION & SECURITY SETUP
// ==================================================
const firebaseConfig = {
  apiKey: "AIzaSyDyIdQB3Pmwcdlvg_HskxCZpiLfoxDAtBw",
  authDomain: "survey-hub-b9176.firebaseapp.com",
  projectId: "survey-hub-b9176",
  storageBucket: "survey-hub-b9176.firebasestorage.app",
  messagingSenderId: "735866501483",
  appId: "1:735866501483:web:242e4cb38f03efe7b4b42e"
};

// Initialize Firebase App, Auth, and Database
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Security Helper: Prevents HTML injection / XSS attacks
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Global State
let currentQuestions = [];

// Navigation Bar Auth Check
const userNav = document.getElementById('userNav');

auth.onAuthStateChanged(user => {
  if (userNav) {
    if (user) {
      userNav.innerHTML = `
        <span style="font-weight: 600; display: block; margin-bottom: 4px;">👤 ${escapeHTML(user.displayName || user.email)}</span>
        <button id="logoutBtn" style="background-color: #ef4444; padding: 5px 10px; font-size: 12px; border-radius: 4px; border: none; color: white; cursor: pointer;">Logout</button>
      `;
      document.getElementById('logoutBtn').addEventListener('click', function() {
        auth.signOut().then(() => {
          alert('Logged out successfully!');
          window.location.href = 'index.html';
        });
      });
    } else {
      userNav.innerHTML = `
        <a href="auth.html" class="primary-btn-link" style="padding: 8px 14px; font-size: 14px;">Login / Sign Up</a>
      `;
    }
  }
});

// -------------------------------------------------------------
// PAGE: AUTHENTICATION (auth.html)
// -------------------------------------------------------------
const showLoginBtn = document.getElementById('showLoginBtn');
const showSignupBtn = document.getElementById('showSignupBtn');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

if (showLoginBtn && showSignupBtn) {
  showLoginBtn.addEventListener('click', function() {
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    showLoginBtn.style.backgroundColor = '#2563eb';
    showSignupBtn.style.backgroundColor = '#64748b';
  });

  showSignupBtn.addEventListener('click', function() {
    signupForm.style.display = 'block';
    loginForm.style.display = 'none';
    showSignupBtn.style.backgroundColor = '#10b981';
    showLoginBtn.style.backgroundColor = '#64748b';
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;

    auth.createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
        return userCredential.user.updateProfile({ displayName: username });
      })
      .then(() => {
        alert('Account created successfully in Cloud!');
        window.location.href = 'index.html';
      })
      .catch(error => {
        alert('Signup Error: ' + error.message);
      });
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        alert('Welcome back!');
        window.location.href = 'index.html';
      })
      .catch(error => {
        alert('Login Error: ' + error.message);
      });
  });
}

// -------------------------------------------------------------
// PAGE 1: CREATOR PAGE (create.html)
// -------------------------------------------------------------
const questionInput = document.getElementById('questionInput');
const questionType = document.getElementById('questionType');
const optionsInput = document.getElementById('optionsInput');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const questionList = document.getElementById('questionList');
const publishBtn = document.getElementById('publishBtn');

if (questionType) {
  questionType.addEventListener('change', function() {
    optionsInput.style.display = (this.value === 'options') ? 'block' : 'none';
  });
}

if (addQuestionBtn) {
  addQuestionBtn.addEventListener('click', function() {
    const text = questionInput.value.trim();
    const type = questionType.value;
    let optionsArray = [];

    if (text === '') {
      alert('Please enter a question!');
      return;
    }

    if (type === 'options') {
      const rawOptions = optionsInput.value.trim();
      if (rawOptions === '') {
        alert('Please type options separated by commas!');
        return;
      }
      optionsArray = rawOptions.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
    }

    currentQuestions.push({ questionText: text, type: type, options: optionsArray });
    renderQuestions();
    questionInput.value = '';
    optionsInput.value = '';
  });
}

function renderQuestions() {
  questionList.innerHTML = '';
  currentQuestions.forEach((q, index) => {
    const card = document.createElement('div');
    card.className = 'question-item';
    // XSS Fix applied here
    let contentHTML = `<h3>Q${index + 1}: ${escapeHTML(q.questionText)}</h3>`;
    if (q.type === 'text') {
      contentHTML += `<input type="text" placeholder="Respondent types answer here..." disabled>`;
    } else if (q.type === 'options') {
      contentHTML += `<div style="margin-top: 8px;">`;
      (q.options || []).forEach(opt => {
        contentHTML += `<div style="margin-bottom: 5px;"><input type="radio" disabled> ${escapeHTML(opt)}</div>`;
      });
      contentHTML += `</div>`;
    }
    card.innerHTML = contentHTML;
    questionList.appendChild(card);
  });
}

if (publishBtn) {
  publishBtn.addEventListener('click', function() {
    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to create a survey!');
      window.location.href = 'auth.html';
      return;
    }

    const title = document.getElementById('surveyTitle').value.trim();
    const desc = document.getElementById('surveyDesc').value.trim();

    if (!title || !desc) {
      alert('Please fill out both title and description!');
      return;
    }

    if (currentQuestions.length === 0) {
      alert('Please add at least one question!');
      return;
    }

    const newSurvey = {
      title: title,
      description: desc,
      creatorEmail: user.email,
      creatorUsername: user.displayName || user.email,
      questions: currentQuestions,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('surveys').add(newSurvey)
      .then(() => {
        alert('Survey published to Firebase Cloud successfully!');
        window.location.href = 'index.html';
      })
      .catch(error => {
        alert('Publishing Error: ' + error.message);
      });
  });
}

// -------------------------------------------------------------
// PAGE 2: HOME PAGE FEED (index.html)
// -------------------------------------------------------------
const surveysFeed = document.getElementById('surveysFeed');
const mySurveysSection = document.getElementById('mySurveysSection');
const mySurveysFeed = document.getElementById('mySurveysFeed');

if (surveysFeed) {
  auth.onAuthStateChanged(user => {
    db.collection('responses').get().then(respSnapshot => {
      const allResponses = respSnapshot.docs.map(doc => doc.data());

      db.collection('surveys').get().then(snapshot => {
        const savedSurveys = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 1. Render Public Feed
        if (savedSurveys.length > 0) {
          surveysFeed.innerHTML = '';
          savedSurveys.forEach(survey => {
            const qList = survey.questions || [];
            const hasTaken = user && allResponses.some(r => String(r.surveyId) === String(survey.id) && r.respondentEmail === user.email);

            const card = document.createElement('div');
            card.className = 'survey-feed-card';
            // XSS Fix applied here
            card.innerHTML = `
              <h3>${escapeHTML(survey.title)}</h3>
              <p>${escapeHTML(survey.description)}</p>
              <small style="display: block; margin-bottom: 4px; color: #64748b;">By: ${escapeHTML(survey.creatorUsername || 'Anonymous')}</small>
              <small style="display: block; margin-bottom: 12px; color: #64748b;">Total Questions: ${qList.length}</small>
              ${
                hasTaken 
                ? `<span style="display: inline-block; padding: 6px 12px; background-color: #e2e8f0; color: #475569; font-weight: 600; border-radius: 6px; font-size: 13px;">✓ Already Completed</span>`
                : `<a href="take.html?id=${survey.id}" class="primary-btn-link" style="padding: 8px 14px; display: inline-block; width: auto; font-size: 14px;">Take Survey →</a>`
              }
            `;
            surveysFeed.appendChild(card);
          });
        }

        // 2. Render Logged-In Creator's Surveys Section
        if (user && mySurveysSection && mySurveysFeed) {
          const mySurveys = savedSurveys.filter(s => s.creatorEmail === user.email);
          mySurveysSection.style.display = 'block';

          if (mySurveys.length > 0) {
            mySurveysFeed.innerHTML = '';
            mySurveys.forEach(survey => {
              const card = document.createElement('div');
              card.className = 'survey-feed-card';
              card.style.borderLeft = '4px solid #10b981';
              // XSS Fix applied here
              card.innerHTML = `
                <h3>${escapeHTML(survey.title)}</h3>
                <p>${escapeHTML(survey.description)}</p>
                <div style="margin-top: 12px; display: flex; gap: 10px;">
                  <a href="results.html?id=${survey.id}" class="primary-btn-link" style="padding: 8px 14px; display: inline-block; width: auto; font-size: 14px; background-color: #10b981;">View Results 📊</a>
                  <a href="take.html?id=${survey.id}" class="primary-btn-link" style="padding: 8px 14px; display: inline-block; width: auto; font-size: 14px; background-color: #64748b;">Preview →</a>
                </div>
              `;
              mySurveysFeed.appendChild(card);
            });
          } else {
            mySurveysFeed.innerHTML = `<p style="color: #64748b;">You haven't created any surveys yet.</p>`;
          }
        }
      });
    });
  });
}

// -------------------------------------------------------------
// PAGE 3: RESPONDENT TAKING PAGE (take.html)
// -------------------------------------------------------------
const submitSurveyBtn = document.getElementById('submitSurveyBtn');

if (submitSurveyBtn) {
  const urlParams = new URLSearchParams(window.location.search);
  const surveyId = urlParams.get('id');

  auth.onAuthStateChanged(user => {
    if (!surveyId) {
      document.getElementById('takeSurveyTitle').innerText = 'Survey Not Found!';
      document.getElementById('takeSurveyDesc').innerText = 'Please go back to the home page and select a valid survey.';
      return;
    }

    db.collection('surveys').doc(surveyId).get().then(doc => {
      if (!doc.exists) {
        document.getElementById('takeSurveyTitle').innerText = 'Survey Not Found!';
        document.getElementById('takeSurveyDesc').innerText = 'Please go back to the home page and select a valid survey.';
        return;
      }

      const activeSurvey = doc.data();

      // Check Duplicate Submission
      db.collection('responses')
        .where('surveyId', '==', surveyId)
        .where('respondentEmail', '==', user ? user.email : '')
        .get()
        .then(respSnap => {
          if (!respSnap.empty && user) {
            document.getElementById('takeSurveyTitle').innerText = activeSurvey.title;
            document.getElementById('takeSurveyDesc').innerText = activeSurvey.description;

            const formContainer = document.getElementById('surveyForm');
            if (formContainer) {
              formContainer.innerHTML = `
                <div class="card" style="background-color: #fef2f2; border: 1px solid #fca5a5; text-align: center; padding: 25px; margin-top: 20px;">
                  <h3 style="color: #991b1b; margin-bottom: 8px;">⚠️ Already Submitted</h3>
                  <p style="color: #7f1d1d; margin-bottom: 15px;">You have already completed this survey using account (${escapeHTML(user.email)}). Duplicate attempts are disabled.</p>
                  <a href="index.html" class="primary-btn-link" style="display: inline-block; width: auto; padding: 8px 18px; background-color: #64748b;">Back to Dashboard</a>
                </div>
              `;
            }
          } else {
            // Render Questions
            document.getElementById('takeSurveyTitle').innerText = activeSurvey.title;
            document.getElementById('takeSurveyDesc').innerText = activeSurvey.description;

            const questionsContainer = document.getElementById('surveyQuestionsContainer');
            questionsContainer.innerHTML = '';

            const surveyQuestions = activeSurvey.questions || [];

            surveyQuestions.forEach((q, index) => {
              const card = document.createElement('div');
              card.className = 'question-item';

              // XSS Fix applied here
              let inputHTML = `<h3>Q${index + 1}: ${escapeHTML(q.questionText)}</h3>`;

              if (q.type === 'text') {
                inputHTML += `<input type="text" name="q_${index}" placeholder="Type your answer...">`;
              } else if (q.type === 'options') {
                (q.options || []).forEach(opt => {
                  inputHTML += `
                    <div style="margin-top: 6px;">
                      <label>
                        <input type="radio" name="q_${index}" value="${escapeHTML(opt)}"> ${escapeHTML(opt)}
                      </label>
                    </div>
                  `;
                });
              }

              card.innerHTML = inputHTML;
              questionsContainer.appendChild(card);
            });

            // Prevent default form behavior and submit
            submitSurveyBtn.onclick = function(e) {
              e.preventDefault();

              if (!user) {
                alert('You must be logged in to submit a survey!');
                window.location.href = 'auth.html';
                return;
              }

              const consentChecked = document.getElementById('consentCheckbox').checked;
              if (!consentChecked) {
                alert('You must give consent before submitting your answers!');
                return;
              }

              let userAnswers = [];
              let allAnswered = true;

              surveyQuestions.forEach((q, index) => {
                if (q.type === 'text') {
                  const inputEl = document.querySelector(`input[name="q_${index}"]`);
                  if (!inputEl || inputEl.value.trim() === '') {
                    allAnswered = false;
                  } else {
                    userAnswers.push({ question: q.questionText, answer: inputEl.value.trim() });
                  }
                } else if (q.type === 'options') {
                  const checkedEl = document.querySelector(`input[name="q_${index}"]:checked`);
                  if (!checkedEl) {
                    allAnswered = false;
                  } else {
                    userAnswers.push({ question: q.questionText, answer: checkedEl.value });
                  }
                }
              });

              if (!allAnswered) {
                alert('Please answer all questions before submitting!');
                return;
              }

              const responseEntry = {
                surveyId: surveyId,
                surveyTitle: activeSurvey.title,
                respondentEmail: user.email,
                respondentUsername: user.displayName || user.email,
                submittedAt: new Date().toLocaleString(),
                answers: userAnswers
              };

              db.collection('responses').add(responseEntry)
                .then(() => {
                  alert('Thank you! Your response has been saved to Firebase.');
                  window.location.href = 'index.html';
                })
                .catch(err => alert('Submission Error: ' + err.message));
            };
          }
        });
    });
  });
}

// -------------------------------------------------------------
// PAGE 4: RESULTS DASHBOARD (results.html)
// -------------------------------------------------------------
const analyticsContainer = document.getElementById('analyticsContainer');

if (analyticsContainer) {
  const urlParams = new URLSearchParams(window.location.search);
  const surveyId = urlParams.get('id');

  if (!surveyId) {
    document.getElementById('resSurveyTitle').innerText = 'Survey Analytics Not Found!';
  } else {
    // FIX: Wrapped in auth.onAuthStateChanged to prevent race condition
    auth.onAuthStateChanged(user => {
      if (!user) {
        alert("You must be logged in to view results.");
        window.location.href = "auth.html";
        return;
      }

      db.collection('surveys').doc(surveyId).get().then(surveyDoc => {
        if (!surveyDoc.exists) {
          document.getElementById('resSurveyTitle').innerText = 'Survey Analytics Not Found!';
          return;
        }

        const activeSurvey = surveyDoc.data();

        // --------------------------------------------------
        // SECURITY CHECK: Only allow the survey creator in!
        // --------------------------------------------------
        if (user.email !== activeSurvey.creatorEmail) {
          alert("Unauthorized access! Only the survey creator can view these results.");
          window.location.href = "index.html";
          return;
        }

        db.collection('responses').where('surveyId', '==', surveyId).get().then(respSnap => {
          const surveyResponses = respSnap.docs.map(doc => doc.data());

          // Using innerText here is inherently safe from XSS
          document.getElementById('resSurveyTitle').innerText = activeSurvey.title;
          document.getElementById('resSurveyDesc').innerText = activeSurvey.description;
          document.getElementById('totalSubmissionsCount').innerText = `Total Submissions: ${surveyResponses.length}`;

          const totalCount = surveyResponses.length;

          function cleanText(str) {
            return str.toLowerCase().trim().replace(/[^\w\s]/gi, '');
          }

          analyticsContainer.innerHTML = '';

          (activeSurvey.questions || []).forEach((q, qIdx) => {
            const qCard = document.createElement('div');
            qCard.className = 'card';
            qCard.style.marginBottom = '20px';

            // XSS Fix applied here
            let qHTML = `<h3>Q${qIdx + 1}: ${escapeHTML(q.questionText)}</h3><hr style="margin: 10px 0;">`;

            if (totalCount === 0) {
              qHTML += `<p style="color: #64748b;">No responses submitted yet.</p>`;
            } else if (q.type === 'options') {
              (q.options || []).forEach(opt => {
                let optCount = 0;
                surveyResponses.forEach(r => {
                  const ansObj = (r.answers || []).find(a => a.question === q.questionText);
                  if (ansObj && ansObj.answer === opt) optCount++;
                });

                const pct = ((optCount / totalCount) * 100).toFixed(1);

                // XSS Fix applied here
                qHTML += `
                  <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 4px;">
                      <span>${escapeHTML(opt)}</span>
                      <span>${optCount} votes (${pct}%)</span>
                    </div>
                    <div style="background-color: #e2e8f0; border-radius: 6px; height: 12px; overflow: hidden;">
                      <div style="background-color: #2563eb; width: ${pct}%; height: 100%;"></div>
                    </div>
                  </div>
                `;
              });
            } else if (q.type === 'text') {
              let frequencyMap = {};
              let rawAnswers = [];

              surveyResponses.forEach(r => {
                const ansObj = (r.answers || []).find(a => a.question === q.questionText);
                if (ansObj && ansObj.answer) {
                  const raw = ansObj.answer.trim();
                  const cleaned = cleanText(raw);
                  rawAnswers.push(raw);
                  frequencyMap[cleaned] = (frequencyMap[cleaned] || 0) + 1;
                }
              });

              let topCleanAnswer = '';
              let highestFreq = 0;
              for (let key in frequencyMap) {
                if (frequencyMap[key] > highestFreq) {
                  highestFreq = frequencyMap[key];
                  topCleanAnswer = key;
                }
              }

              if (highestFreq > 0) {
                // XSS Fix applied here
                qHTML += `
                  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 6px; margin-bottom: 12px;">
                    <strong>🏆 Most Common Answer Group:</strong> "${escapeHTML(topCleanAnswer)}" (${highestFreq} respondents)
                  </div>
                `;
              }

              qHTML += `<p><strong>All Text Entries (${rawAnswers.length}):</strong></p><ul style="margin-top: 5px; padding-left: 20px;">`;
              rawAnswers.forEach(ans => {
                // XSS Fix applied here
                qHTML += `<li style="margin-bottom: 4px;">${escapeHTML(ans)}</li>`;
              });
              qHTML += `</ul>`;
            }

            qCard.innerHTML = qHTML;
            analyticsContainer.appendChild(qCard);
          });

          const indContainer = document.getElementById('individualResponsesContainer');
          indContainer.innerHTML = '';

          if (surveyResponses.length === 0) {
            indContainer.innerHTML = '<p style="color: #64748b;">No responses recorded.</p>';
          } else {
            surveyResponses.forEach((r, idx) => {
              const indCard = document.createElement('div');
              indCard.className = 'card';
              indCard.style.marginBottom = '15px';

              // XSS Fix applied here
              let indHTML = `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px;">
                  <strong>Respondent #${idx + 1}: ${escapeHTML(r.respondentUsername)} (${escapeHTML(r.respondentEmail)})</strong>
                  <small style="color: #64748b;">${escapeHTML(r.submittedAt)}</small>
                </div>
              `;

              (r.answers || []).forEach((ans, aIdx) => {
                // XSS Fix applied here
                indHTML += `<p style="margin-bottom: 5px;"><strong>Q${aIdx + 1}: ${escapeHTML(ans.question)}</strong> → <em>${escapeHTML(ans.answer)}</em></p>`;
              });

              indCard.innerHTML = indHTML;
              indContainer.appendChild(indCard);
            });
          }
        });
      });
    });
  }
}