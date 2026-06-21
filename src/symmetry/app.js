    document.addEventListener('DOMContentLoaded', function () {
      const mobileNavToggle = document.getElementById('mobileNavToggle');
      const sageNavLinks = document.querySelector('.sage-nav-links');

      if (!mobileNavToggle || !sageNavLinks) return;

      mobileNavToggle.addEventListener('click', function () {
        const isExpanded = mobileNavToggle.getAttribute('aria-expanded') === 'true';
        mobileNavToggle.setAttribute('aria-expanded', String(!isExpanded));
        sageNavLinks.classList.toggle('open');
      });

      sageNavLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function () {
          if (window.innerWidth <= 860 && sageNavLinks.classList.contains('open')) {
            sageNavLinks.classList.remove('open');
            mobileNavToggle.setAttribute('aria-expanded', 'false');
          }
        });
      });

      window.addEventListener('resize', function () {
        if (window.innerWidth > 860 && sageNavLinks.classList.contains('open')) {
          sageNavLinks.classList.remove('open');
          mobileNavToggle.setAttribute('aria-expanded', 'false');
        }
      });
    });

/* ===== BLOCK ===== */

    (function () {
      const overlay = document.getElementById('bookingModalOverlay');
      const openBtn = document.getElementById('bookNowBtn');
      const closeBtn = overlay.querySelector('.booking-modal__close');
      const cancelBtn = overlay.querySelector('.booking-cancel');
      const form = document.getElementById('bookingForm');
      let lastActiveElement = null;

      function openModal() {
        lastActiveElement = document.activeElement;
        const dateInput = form.querySelector('#bk-date');
        const timeInput = form.querySelector('#bk-time');
        const slotInfo = form.querySelector('#bookingSlotInfo');

        if (selectedDate && dateInput) {
          dateInput.value = selectedDate;
        }

        if (selectedTime && timeInput) {
          timeInput.value = convertTimeToInput(selectedTime);
        }

        if (slotInfo) {
          if (selectedDate && selectedTime) {
            const localDate = new Date(selectedDate);
            const displayDate = localDate.toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            slotInfo.innerHTML = `<strong>Selected slot:</strong> ${displayDate} at ${selectedTime}`;
          } else {
            slotInfo.innerHTML = '<strong>Selected slot:</strong> Select a date and time first.';
          }
        }

        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden','false');
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
        document.addEventListener('keydown', onKeyDown);
      }

      function convertTimeToInput(slotTime) {
        if (!slotTime) return '';
        const [time, modifier] = slotTime.split(' ');
        const [hoursStr, minutesStr] = time.split(':');
        let hours = Number(hoursStr);
        const minutes = Number(minutesStr);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }

      function closeModal() {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden','true');
        document.removeEventListener('keydown', onKeyDown);
        if (lastActiveElement) lastActiveElement.focus();
      }

      function onKeyDown(e) { if (e.key === 'Escape') closeModal(); }

      overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

      if (openBtn) openBtn.addEventListener('click', openModal);
      if (closeBtn) closeBtn.addEventListener('click', closeModal);
      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      async function storeBookingTransaction(transactionData) {
        try {
          await storeTransaction(transactionData);
          return true;
        } catch (error) {
          console.error('Failed to store booking transaction:', error);
          return false;
        }
      }

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = (form.querySelector('[name="name"]').value || '').trim();
        const contact = (form.querySelector('[name="contact"]').value || '').trim();
        const date = (form.querySelector('[name="date"]').value || '').trim();
        const time = (form.querySelector('[name="time"]').value || '').trim();
        const meetingTypeEl = form.querySelector('[name="meetingType"]:checked');
        const meetingType = meetingTypeEl ? meetingTypeEl.value : '';

        if (!name || !contact || !date || !time) {
          alert('Please complete all required fields before continuing.');
          return;
        }

        // Validate date and time
        const dateObj = new Date(`${date}T${time}`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateObj < today) {
          alert('Please select a future date. The date you chose has already passed.');
          return;
        }

        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        if (dateObj > oneYearFromNow) {
          alert('Please select a date within the next year.');
          return;
        }

        const hour = dateObj.getHours();
        const minutes = dateObj.getMinutes();
        const totalMinutes = hour * 60 + minutes;
        const startMinutes = 8 * 60 + 30; // 8:30 AM
        const endMinutes = 19 * 60; // 7:00 PM

        if (totalMinutes < startMinutes || totalMinutes > endMinutes) {
          alert('Please select a time between 8:30 AM and 7:00 PM.');
          return;
        }

        // Show confirmation modal
        showBookingConfirmation({
          name,
          contact,
          date,
          time,
          meetingType,
          dateObj
        });
      });
    })();

    // Global booking data for confirmation modal
    let pendingBookingData = null;

    // Booking confirmation modal
    function showBookingConfirmation(bookingData) {
      pendingBookingData = bookingData;
      const modal = document.createElement('div');
      modal.id = 'bookingConfirmationModal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(7, 12, 31, 0.92);
        backdrop-filter: blur(18px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
      `;

      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][bookingData.dateObj.getDay()];
      const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][bookingData.dateObj.getMonth()];
      const dateStr = `${dayName}, ${monthName} ${bookingData.dateObj.getDate()}, ${bookingData.dateObj.getFullYear()}`;

      const timeObj = new Date(`2000-01-01T${bookingData.time}`);
      let hour = timeObj.getHours();
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      const minutes = String(timeObj.getMinutes()).padStart(2, '0');
      const timeStr = `${hour}:${minutes} ${ampm}`;

      modal.innerHTML = `
        <div style="background: linear-gradient(180deg, rgba(15,23,42,0.98), rgba(8,12,24,0.99)); border: 1px solid rgba(148,163,184,0.12); border-radius: 28px; padding: 40px; max-width: 600px; width: 94%; max-height: 90vh; overflow-y: auto; box-shadow: 0 30px 80px rgba(0,0,0,0.35);">
          <h2 style="font-size: 1.6rem; font-weight: 700; color: #f8fafc; margin-bottom: 6px;">Confirm Your Booking</h2>
          <p style="color: #94a3b8; font-size: 0.96rem; margin-bottom: 32px;">Please review your booking details below.</p>

          <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(148,163,184,0.12); border-radius: 18px; padding: 24px; margin-bottom: 28px; display: flex; flex-direction: column; gap: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid rgba(148,163,184,0.12);">
              <span style="color: #94a3b8; font-size: 0.95rem;">Name</span>
              <span style="color: #cbd5e1; font-weight: 600;">${escapeHtml(bookingData.name)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid rgba(148,163,184,0.12);">
              <span style="color: #94a3b8; font-size: 0.95rem;">Contact</span>
              <span style="color: #cbd5e1; font-weight: 600;">${escapeHtml(bookingData.contact)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid rgba(148,163,184,0.12);">
              <span style="color: #94a3b8; font-size: 0.95rem;">Date</span>
              <span style="color: #cbd5e1; font-weight: 600;">${dateStr}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid rgba(148,163,184,0.12);">
              <span style="color: #94a3b8; font-size: 0.95rem;">Time</span>
              <span style="color: #cbd5e1; font-weight: 600;">${timeStr}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #94a3b8; font-size: 0.95rem;">Meeting Type</span>
              <span style="color: #cbd5e1; font-weight: 600;">${bookingData.meetingType}</span>
            </div>
          </div>

          <div style="display: flex; gap: 12px;">
            <button onclick="document.getElementById('bookingConfirmationModal').remove();" style="background: transparent; color: #94a3b8; border: 1px solid rgba(148,163,184,0.35); padding: 12px 24px; border-radius: 16px; font-weight: 600; cursor: pointer; flex: 1; transition: all 0.3s ease;">Back</button>
            <button onclick="confirmAndBookSession()" style="background: linear-gradient(135deg, #22d3ee, #0ea5e9); color: #020617; border: none; padding: 12px 24px; border-radius: 16px; font-weight: 700; cursor: pointer; flex: 1; transition: transform 0.2s ease, box-shadow 0.2s ease; box-shadow: 0 14px 28px rgba(2, 6, 23, 0.18);">Confirm and Book</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    }

    function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

    async function confirmAndBookSession() {
      if (!pendingBookingData) return;

      const bookingData = pendingBookingData;
      const bookingId = `booking_${Date.now()}`;
      const transaction = {
        id: bookingId,
        type: 'booking',
        status: 'booked',
        name: bookingData.name,
        contact: bookingData.contact,
        date: bookingData.date,
        time: bookingData.time,
        meetingType: bookingData.meetingType,
        createdAt: new Date().toISOString()
      };

      try {
        await storeTransaction(transaction);
      } catch (error) {
        console.error('Failed to store booking:', error);
      }

      // Remove confirmation modal
      const confirmModal = document.getElementById('bookingConfirmationModal');
      if (confirmModal) confirmModal.remove();

      // Close booking form modal
      const bookingOverlay = document.getElementById('bookingModalOverlay');
      if (bookingOverlay) bookingOverlay.classList.remove('active');

      // Show success message with "we'll be in touch" text
      showBookingSuccess();

      // Refresh overview to show new appointment
      if (window.refreshOverviewMetrics) {
        await new Promise(resolve => setTimeout(resolve, 500));
        window.refreshOverviewMetrics();
      }

      // Open mailto
      const subject = `Booking Request — ${bookingData.name}`;
      const bodyLines = [
        `Name: ${bookingData.name}`,
        `Contact: ${bookingData.contact}`,
        `Date: ${bookingData.date}`,
        `Time: ${bookingData.time}`,
        `Meeting Type: ${bookingData.meetingType}`,
        '',
        'Notes:',
        '(Please reply with confirmation or further instructions)'
      ];
      const body = bodyLines.join('\n');
      const recipient = 'greenpurpleveins@gmail.com';
      const mailto = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
    }

    function showBookingSuccess() {
      const modal = document.createElement('div');
      modal.id = 'bookingSuccessModal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(7, 12, 31, 0.92);
        backdrop-filter: blur(18px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10002;
      `;

      modal.innerHTML = `
        <div style="background: linear-gradient(180deg, rgba(15,23,42,0.98), rgba(8,12,24,0.99)); border: 1px solid rgba(34,211,238,0.25); border-radius: 28px; padding: 48px; max-width: 500px; width: 94%; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.35);">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.5" style="margin: 0 auto 24px; display: block;">
            <path d="M9 12l2 2 4-4"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <h2 style="font-size: 1.5rem; font-weight: 700; color: #f8fafc; margin-bottom: 12px;">Booking Confirmed</h2>
          <p style="color: #cbd5e1; font-size: 1rem; line-height: 1.6; margin-bottom: 24px;">Your appointment has been saved to your calendar.<br><strong style="color: #22d3ee;">We'll be in touch with you soon.</strong></p>
          <button onclick="closeAllBookingModals()" style="background: linear-gradient(135deg, #22d3ee, #0ea5e9); color: #020617; border: none; padding: 12px 28px; border-radius: 16px; font-weight: 700; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; box-shadow: 0 14px 28px rgba(2, 6, 23, 0.18);">Got it</button>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => {
        const modal = document.getElementById('bookingSuccessModal');
        if (modal) modal.remove();
      }, 4000);
    }

    function closeAllBookingModals() {
      const bookingOverlay = document.getElementById('bookingModalOverlay');
      if (bookingOverlay) {
        bookingOverlay.classList.remove('active');
        bookingOverlay.setAttribute('aria-hidden', 'true');
      }
      const confirmModal = document.getElementById('bookingConfirmationModal');
      if (confirmModal) confirmModal.remove();
      const successModal = document.getElementById('bookingSuccessModal');
      if (successModal) successModal.remove();
      pendingBookingData = null;
    }

/* ===== BLOCK ===== */

    // Dynamic Time-Based Greeting
    function updateGreeting() {
      const hour = new Date().getHours();
      const userName = localStorage.getItem('userName') || 'Explorer';
      const greetingHeader = document.getElementById('greetingHeader');
      const swahiliGreeting = document.getElementById('swahiliGreeting');
      const dayDisplay = document.getElementById('dayDisplay');
      
      let greeting = '';
      let swahili = '';
      
      if (hour >= 5 && hour < 12) {
        greeting = `Good morning, <span style="color: #87a96b;">${userName}</span>`;
        swahili = 'Habari za asubuhi';
      } else if (hour >= 12 && hour < 17) {
        greeting = `Good afternoon, <span style="color: #87a96b;">${userName}</span>`;
        swahili = 'Habari za mchana';
      } else if (hour >= 17 && hour < 21) {
        greeting = `Good evening, <span style="color: #87a96b;">${userName}</span>`;
        swahili = 'Habari za jioni';
      } else {
        greeting = `Rest well, <span style="color: #87a96b;">${userName}</span>`;
        swahili = 'Lala salama';
      }
      
      greetingHeader.innerHTML = greeting;
      swahiliGreeting.textContent = swahili;
      
      // Update day display
      const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      dayDisplay.textContent = `It's ${currentDay}`;
      updateSessionDate();
      
      // Fade in animation
      setTimeout(() => {
        greetingHeader.style.opacity = '1';
        swahiliGreeting.style.opacity = '1';
        dayDisplay.style.opacity = '0.7';
      }, 100);
    }

    function updateSessionDate() {
      const sessionDateDisplay = document.getElementById('sessionDateDisplay');
      if (!sessionDateDisplay) return;

      const now = new Date();
      const monthName = now.toLocaleDateString('en-US', { month: 'long' });
      const dayOfMonth = now.getDate();
      sessionDateDisplay.textContent = `${monthName} ${dayOfMonth}`;
    }
    
    // Initialize greeting on page load
    document.addEventListener('DOMContentLoaded', updateGreeting);
    document.addEventListener('DOMContentLoaded', updateSessionDate);
    
    // Initialize daily momentum on page load
    document.addEventListener('DOMContentLoaded', loadDailyMomentum);
    
    // Load recent wins on page load
    document.addEventListener('DOMContentLoaded', loadRecentWins);

    // Clarity Engine Modal Functions
    function openClarityEngineModal() {
      document.getElementById('clarityEngineModal').style.display = 'flex';
    }
    
    function closeClarityEngineModal() {
      document.getElementById('clarityEngineModal').style.display = 'none';
    }
    
    function selectTemplate(template, event) {
      // Update button styles
      document.querySelectorAll('.template-btn').forEach(btn => {
        btn.style.background = '#F5F5F0';
        btn.style.borderColor = 'transparent';
      });
      event.currentTarget.style.background = 'rgba(135, 169, 107, 0.1)';
      event.currentTarget.style.borderColor = '#87A96B';
      
      // Show/hide template content
      document.querySelectorAll('.template-content').forEach(content => {
        content.style.display = 'none';
      });
      
      if (template === 'eisenhower') {
        document.getElementById('eisenhowerTemplate').style.display = 'block';
      } else if (template === 'firstPrinciples') {
        document.getElementById('firstPrinciplesTemplate').style.display = 'block';
      }
    }
    
    function processEisenhower() {
      const tasks = document.getElementById('eisenhowerTasks').value.split('\n').filter(t => t.trim());
      if (tasks.length === 0) {
        alert('Please enter at least one task');
        return;
      }
      
      // Simple distribution (in a real app, this would ask the user to categorize each task)
      const doFirst = document.getElementById('doFirst');
      const schedule = document.getElementById('schedule');
      const delegate = document.getElementById('delegate');
      const eliminate = document.getElementById('eliminate');
      
      doFirst.innerHTML = '';
      schedule.innerHTML = '';
      delegate.innerHTML = '';
      eliminate.innerHTML = '';
      
      tasks.forEach((task, index) => {
        const taskDiv = document.createElement('div');
        taskDiv.style.padding = '4px 8px';
        taskDiv.style.background = 'rgba(255, 255, 255, 0.5)';
        taskDiv.style.borderRadius = '4px';
        taskDiv.style.marginBottom = '4px';
        taskDiv.style.fontSize = '0.75rem';
        taskDiv.textContent = task;
        
        // Distribute tasks evenly for demo
        if (index % 4 === 0) doFirst.appendChild(taskDiv);
        else if (index % 4 === 1) schedule.appendChild(taskDiv);
        else if (index % 4 === 2) delegate.appendChild(taskDiv);
        else eliminate.appendChild(taskDiv);
      });
      
      // Save Momentum Point
      saveMomentumPoint('decision', 'Eisenhower Matrix');
      
      alert('Tasks processed! Momentum point saved.');
    }
    
    function processFirstPrinciples() {
      const decision = document.getElementById('firstPrinciplesDecision').value;
      const assumptions = document.getElementById('firstPrinciplesAssumptions').value;
      const fundamentals = document.getElementById('firstPrinciplesFundamentals').value;
      const reconstruct = document.getElementById('firstPrinciplesReconstruct').value;
      
      if (!decision || !assumptions || !fundamentals || !reconstruct) {
        alert('Please fill in all fields');
        return;
      }
      
      // Save Momentum Point
      saveMomentumPoint('decision', 'First Principles Thinking');
      
      alert('Decision analysis saved! Momentum point saved.');
      closeClarityEngineModal();
      
      // Clear form
      document.getElementById('firstPrinciplesDecision').value = '';
      document.getElementById('firstPrinciplesAssumptions').value = '';
      document.getElementById('firstPrinciplesFundamentals').value = '';
      document.getElementById('firstPrinciplesReconstruct').value = '';
    }
    
    // Pomodoro Timer Functions
    let pomodoroInterval = null;
    let pomodoroTimeLeft = 25 * 60; // 25 minutes in seconds
    let pomodoroMode = 'focus'; // 'focus' or 'break'
    let isPomodoroRunning = false;
    
    function updatePomodoroDisplay() {
      const minutes = Math.floor(pomodoroTimeLeft / 60);
      const seconds = pomodoroTimeLeft % 60;
      document.getElementById('pomodoroDisplay').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Update progress ring
      const totalTime = pomodoroMode === 'focus' ? 25 * 60 : 5 * 60;
      const progress = (totalTime - pomodoroTimeLeft) / totalTime;
      const circumference = 2 * Math.PI * 54;
      const dashOffset = circumference * (1 - progress);
      document.getElementById('pomodoroRing').style.strokeDashoffset = dashOffset;
    }
    
    function startPomodoro() {
      if (isPomodoroRunning) {
        // Pause
        clearInterval(pomodoroInterval);
        isPomodoroRunning = false;
        document.getElementById('pomodoroStartBtn').textContent = 'Start';
        return;
      }
      
      isPomodoroRunning = true;
      document.getElementById('pomodoroStartBtn').textContent = 'Pause';
      
      pomodoroInterval = setInterval(() => {
        pomodoroTimeLeft--;
        updatePomodoroDisplay();
        
        if (pomodoroTimeLeft <= 0) {
          clearInterval(pomodoroInterval);
          isPomodoroRunning = false;
          document.getElementById('pomodoroStartBtn').textContent = 'Start';
          
          // Save Momentum Point
          saveMomentumPoint('focus', pomodoroMode === 'focus' ? 'Focus Session' : 'Break');
          
          // Switch mode
          if (pomodoroMode === 'focus') {
            pomodoroMode = 'break';
            pomodoroTimeLeft = 5 * 60;
            document.getElementById('pomodoroMode').textContent = 'Break';
            alert('Focus session complete! Take a 5-minute break.');
          } else {
            pomodoroMode = 'focus';
            pomodoroTimeLeft = 25 * 60;
            document.getElementById('pomodoroMode').textContent = 'Focus';
            alert('Break complete! Ready for another focus session?');
          }
          updatePomodoroDisplay();
        }
      }, 1000);
    }
    
    function resetPomodoro() {
      clearInterval(pomodoroInterval);
      isPomodoroRunning = false;
      pomodoroMode = 'focus';
      pomodoroTimeLeft = 25 * 60;
      document.getElementById('pomodoroStartBtn').textContent = 'Start';
      document.getElementById('pomodoroMode').textContent = 'Focus';
      updatePomodoroDisplay();
    }
    
    // Momentum Points PouchDB Storage
    async function saveMomentumPoint(type, activity) {
      try {
        const docId = generateDocumentId('momentum');
        const momentumPoint = {
          _id: docId,
          type: 'momentum_point',
          activityType: type, // 'focus' or 'decision'
          activity: activity,
          value: typeof activity === 'number' ? activity : 1,
          timestamp: new Date().toISOString(),
          sageId: localStorage.getItem('luam_client_prefs') ? JSON.parse(localStorage.getItem('luam_client_prefs')).sageId : null
        };

        await luamDB.put(momentumPoint);
        console.log('Momentum point saved successfully:', docId);
      } catch (error) {
        console.error('Error saving momentum point:', error);
      }
    }
    
    // Daily Momentum Tracking
    let dailyMomentumCount = 0;
    const MAX_DAILY_MOMENTUM = 5;
    
    async function loadDailyMomentum() {
      try {
        const today = new Date().toDateString();
        const result = await luamDB.get('daily_momentum_' + today);
        dailyMomentumCount = result.count || 0;
        updateMomentumDisplay();
      } catch (error) {
        // No record for today, start fresh
        dailyMomentumCount = 0;
        updateMomentumDisplay();
      }
    }
    
    async function saveDailyMomentum() {
      try {
        const today = new Date().toDateString();
        const docId = 'daily_momentum_' + today;
        const doc = {
          _id: docId,
          count: dailyMomentumCount,
          date: today
        };
        
        try {
          const existing = await luamDB.get(docId);
          doc._rev = existing._rev;
          await luamDB.put(doc);
        } catch {
          await luamDB.put(doc);
        }
      } catch (error) {
        console.error('Error saving daily momentum:', error);
      }
    }
    
    function updateMomentumDisplay() {
      const circles = document.querySelectorAll('.momentum-circle');
      const countDisplay = document.getElementById('momentumCount');
      if (!countDisplay) return;

      circles.forEach((circle, index) => {
        if (index < dailyMomentumCount) {
          circle.style.background = '#87A96B';
          circle.style.borderColor = '#87A96B';
        } else {
          circle.style.background = 'transparent';
          circle.style.borderColor = '#E8E8E0';
        }
      });
      
      countDisplay.textContent = `${dailyMomentumCount}/${MAX_DAILY_MOMENTUM}`;
    }
    
    function incrementMomentum() {
      if (dailyMomentumCount < MAX_DAILY_MOMENTUM) {
        dailyMomentumCount++;
        updateMomentumDisplay();
        updateMomentumChartData();
        saveDailyMomentum();
        
        if (dailyMomentumCount === MAX_DAILY_MOMENTUM) {
          showSymmetryAchieved();
        }
      }
    }
    
    function showSymmetryAchieved() {
      // Create toast element
      const toast = document.createElement('div');
      toast.style.cssText = 'position: fixed; bottom: 80px; right: 24px; background: rgba(135, 169, 107, 0.95); color: white; padding: 16px 24px; border-radius: 8px; font-family: Livvic, sans-serif; font-size: 0.9rem; z-index: 1000; animation: fadeIn 0.3s ease;';
      toast.textContent = 'Symmetry Achieved';
      document.body.appendChild(toast);
      
      // Remove after 3 seconds
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
    
    // Toggle Utility Expanded Section
    function toggleUtilityExpanded(utilityId) {
      // Close all other expanded sections first
      const allExpandedSections = document.querySelectorAll('[id$="Expanded"]');
      allExpandedSections.forEach(section => {
        if (section.id !== utilityId + 'Expanded') {
          section.style.display = 'none';
        }
      });
      
      // Toggle the clicked section
      const expandedSection = document.getElementById(utilityId + 'Expanded');
      if (expandedSection.style.display === 'none' || !expandedSection.style.display) {
        expandedSection.style.display = 'block';
      } else {
        expandedSection.style.display = 'none';
      }
    }
    
    // Eisenhower (2-box) Functions
    let eisenTaskIdCounter = 0;

    function getEisenList(zone) {
      if (zone === 'do_now') return document.getElementById('eisenDoNowList');
      return document.getElementById('eisenDeferList');
    }

    function createEisenTaskElement(taskId, text, zone) {
      const el = document.createElement('div');
      el.id = taskId;
      el.dataset.zone = zone;
      el.draggable = true;
      el.style.cssText = 'width: 100%; display:flex; align-items:center; justify-content:space-between; gap:8px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(51, 64, 58, 0.12); background: #fffdf8; color: #33403a; font-family: Livvic, sans-serif; font-size: 0.85rem; cursor: grab; box-shadow: 0 1px 2px rgba(51,64,58,0.05); transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;';

      const textSpan = document.createElement('span');
      textSpan.textContent = text;
      textSpan.style.cssText = 'flex:1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';

      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex; align-items:center; gap:6px; flex-shrink:0;';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = '✎';
      editBtn.title = 'Edit task';
      editBtn.style.cssText = 'width: 22px; height: 22px; border-radius: 999px; border: 1px solid rgba(51,64,58,0.12); background: #f7f3ea; color: #5f6f66; cursor: pointer; font-size: 0.7rem;';
      editBtn.onclick = (event) => {
        event.stopPropagation();
        editEisenTask(taskId);
      };

      const handle = document.createElement('span');
      handle.textContent = '⋮⋮';
      handle.title = 'Drag to move';
      handle.style.cssText = 'font-size: 0.7rem; color: #97a298; cursor: grab;';

      actions.appendChild(editBtn);
      actions.appendChild(handle);

      el.appendChild(textSpan);
      el.appendChild(actions);

      el.onmouseenter = () => {
        el.style.transform = 'translateY(-1px)';
        el.style.boxShadow = '0 10px 18px rgba(15,23,42,0.35)';
      };
      el.onmouseleave = () => {
        el.style.transform = 'translateY(0px)';
        el.style.boxShadow = 'none';
      };

      el.ondblclick = () => editEisenTask(taskId);

      el.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', taskId);
        event.dataTransfer.effectAllowed = 'move';
        el.style.opacity = '0.7';
      });

      el.addEventListener('dragend', () => {
        el.style.opacity = '1';
      });

      return el;
    }

    function addEisenTask() {
      const input = document.getElementById('weightLifterInput');
      const raw = input ? input.value : '';
      const text = (raw || '').trim();
      if (!text) return;

      const doNowList = getEisenList('do_now');
      if (!doNowList) return;

      const taskId = 'eisen-task-' + (eisenTaskIdCounter++);
      const taskEl = createEisenTaskElement(taskId, text, 'do_now');
      doNowList.prepend(taskEl);

      input.value = '';
      saveMomentumHistory('captured', 'Eisenhower', text);
    }

    function onEisenDragOver(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }

    function onEisenDrop(event, zone) {
      event.preventDefault();
      const taskId = event.dataTransfer.getData('text/plain');
      if (!taskId) return;
      moveEisenTaskToZone(taskId, zone);
    }

    function moveEisenTaskToZone(taskId, nextZone) {
      const task = document.getElementById(taskId);
      if (!task) return;
      const currentZone = task.dataset.zone === 'defer' ? 'defer' : 'do_now';
      if (currentZone === nextZone) return;

      const nextList = getEisenList(nextZone);
      if (!nextList) return;

      task.dataset.zone = nextZone;
      nextList.prepend(task);

      saveMomentumHistory('sorted', nextZone === 'do_now' ? 'Eisenhower — Do now' : 'Eisenhower — Defer', task.firstChild?.textContent || '');
      incrementMomentum();
      showSkillUp('Prioritization');
    }

    function toggleEisenTaskZone(taskId) {
      const task = document.getElementById(taskId);
      if (!task) return;
      const currentZone = task.dataset.zone === 'defer' ? 'defer' : 'do_now';
      const nextZone = currentZone === 'do_now' ? 'defer' : 'do_now';
      moveEisenTaskToZone(taskId, nextZone);
    }

    function editEisenTask(taskId) {
      const task = document.getElementById(taskId);
      if (!task) return;
      const textNode = task.firstChild;
      const current = (textNode && textNode.textContent) ? textNode.textContent.trim() : '';
      const updated = window.prompt('Edit task', current);
      if (updated === null) return;
      const trimmed = updated.trim();
      if (!trimmed) return;
      textNode.textContent = trimmed;
      saveMomentumHistory('edited', 'Eisenhower', trimmed);
    }
    
    // Fog Clearer Functions
    function updateFogClearer() {
      const textarea = document.getElementById('fogClearerInput');
      const hint = document.getElementById('fogClearerHint');
      const textLength = textarea.value.length;
      
      // Reduce blur as user types more (50+ chars to clear)
      const maxBlur = 4;
      const minBlur = 0;
      const threshold = 50;
      
      if (textLength >= threshold) {
        textarea.style.filter = 'blur(0px)';
        hint.textContent = 'Fog cleared!';
        hint.style.color = '#87A96B';
        
        // Increment momentum on first completion
        if (!textarea.dataset.fogCleared) {
          textarea.dataset.fogCleared = 'true';
          saveMomentumHistory('fog_cleared', 'Fog Clearer', textarea.value.substring(0, 50) + '...');
          incrementMomentum();
          showSkillUp('Cognitive Clarity');
        }
      } else {
        const blurAmount = maxBlur - (textLength / threshold) * maxBlur;
        textarea.style.filter = `blur(${blurAmount}px)`;
        const remaining = threshold - textLength;
        hint.textContent = `Keep typing to clear the fog... (${remaining} more chars)`;
        hint.style.color = '#5A6B73';
      }
    }
    
    // Pulse Functions
    let pulseInterval = null;
    let pulseTimeLeft = 25 * 60; // 25 minutes in seconds
    let isPulseRunning = false;
    
    function togglePulse() {
      const btn = document.getElementById('pulseStartBtn');
      
      if (isPulseRunning) {
        // Stop
        clearInterval(pulseInterval);
        isPulseRunning = false;
        btn.textContent = 'Start Focus';
        btn.style.background = '#87A96B';
      } else {
        // Start
        isPulseRunning = true;
        btn.textContent = 'Stop';
        btn.style.background = '#E8E8E0';
        btn.style.color = '#2F3E46';
        
        pulseInterval = setInterval(() => {
          pulseTimeLeft--;
          updatePulseDisplay();
          
          if (pulseTimeLeft <= 0) {
            clearInterval(pulseInterval);
            isPulseRunning = false;
            btn.textContent = 'Start Focus';
            btn.style.background = '#87A96B';
            btn.style.color = 'white';
            
            // Save Momentum Point and increment daily momentum
            saveMomentumPoint('focus', 'Focus Session');
            saveMomentumHistory('pulse_completed', 'Pulse', '25-minute focus session');
            incrementMomentum();
            showSkillUp('Neural Focus');
            
            alert('Focus session complete!');
            pulseTimeLeft = 25 * 60;
            updatePulseDisplay();
          }
        }, 1000);
      }
    }
    
    function updatePulseDisplay() {
      const minutes = Math.floor(pulseTimeLeft / 60);
      const seconds = pulseTimeLeft % 60;
      document.getElementById('pulseDisplay').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Update momentum data with current daily count
    function updateMomentumChartData() {
      defaultSymmetryData.momentum.data[3] = dailyMomentumCount;
      if (currentSymmetryTab === 'momentum' && typeof updateSymmetryChart === 'function') {
        updateSymmetryChart();
      }
    }
    
    // Momentum History Functions
    async function saveMomentumHistory(actionType, tool, details) {
      try {
        const docId = generateDocumentId('momentum_history');
        const historyEntry = {
          _id: docId,
          type: 'momentum_history',
          actionType: actionType,
          tool: tool,
          details: details,
          timestamp: new Date().toISOString(),
          date: new Date().toDateString()
        };
        
        await luamDB.put(historyEntry);
        console.log('Momentum history saved:', docId);
        loadRecentWins();
      } catch (error) {
        console.error('Error saving momentum history:', error);
      }
    }
    
    async function loadRecentWins() {
      const winsContainer = document.getElementById('recentWins');
      if (!winsContainer) return;

      try {
        const docs = await readAllPouchDocs();
        const wins = docs
          .filter(doc => doc.type === 'momentum_history' && doc.tool)
          .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
          .slice(0, 10);

        if (!wins.length) {
          winsContainer.innerHTML = '<div style="font-size: 0.8rem; color: #5A6B73; font-style: italic;">No wins yet. Start your momentum journey!</div>';
          return;
        }

        winsContainer.innerHTML = '';
        wins.forEach(doc => {
          const winDiv = document.createElement('div');
          winDiv.style.cssText = 'padding: 8px 12px; background: rgba(135, 169, 107, 0.05); border-radius: 6px; font-size: 0.8rem; color: #2F3E46; display: flex; justify-content: space-between; align-items: center;';

          const time = new Date(doc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          winDiv.innerHTML = `
            <span>${escapeHtml(doc.tool)}: ${escapeHtml(doc.details || '')}</span>
            <span style="color: #5A6B73; font-size: 0.75rem;">${time}</span>
          `;

          winsContainer.appendChild(winDiv);
        });
      } catch (error) {
        console.error('Error loading recent wins:', error);
      }
    }
    
    // Skill Level Up Toast
    function showSkillUp(skill) {
      const toast = document.getElementById('skillUpToast');
      toast.textContent = `+1 ${skill}`;
      toast.style.display = 'block';
      toast.style.animation = 'fadeIn 0.3s ease';
      
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
          toast.style.display = 'none';
          toast.style.opacity = '1';
        }, 300);
      }, 2000);
    }
    
    function toggleCognitiveMomentum(event) {
      event.preventDefault();
      event.stopPropagation();
      toggleUtilityExpanded('cognitiveMomentum');
    }

    // PouchDB Database Initialization
    // The IndexedDB adapter is automatically registered by the plugin
    const luamDB = new PouchDB('luam_local_vault', {
      adapter: 'idb',
      auto_compaction: true
    });
    window.luamDB = luamDB;

    // Encryption Hook for PouchDB
    const originalPut = luamDB.put.bind(luamDB);
    const originalGet = luamDB.get.bind(luamDB);
    const originalAllDocs = luamDB.allDocs.bind(luamDB);

    function hasRecoverySeed() {
      try {
        const clientPrefs = localStorage.getItem('luam_client_prefs');
        if (!clientPrefs) return false;
        const prefs = JSON.parse(clientPrefs);
        return Array.isArray(prefs.recoverySeed) && prefs.recoverySeed.length > 0;
      } catch {
        return false;
      }
    }

    luamDB.put = async function(doc) {
      try {
        // Skip encryption for design docs and internal docs
        if (doc._id && doc._id.startsWith('_design')) {
          return originalPut(doc);
        }

        if (!hasRecoverySeed()) {
          return originalPut(doc);
        }

        // Add metadata to document
        const docWithMetadata = {
          ...doc,
          _meta: {
            encrypted: true,
            timestamp: new Date().toISOString(),
            version: '1.0'
          }
        };

        // Encrypt the document data
        let encryptedDoc;

        try {
          const encryptedData = await encryptData(docWithMetadata);
          encryptedDoc = {
            _id: doc._id,
            _rev: doc._rev,
            _encrypted: true,
            data: encryptedData
          };
        } catch (encryptionError) {
          console.warn('Encryption skipped - saving plain document:', encryptionError.message);
          return originalPut(doc);
        }

        return originalPut(encryptedDoc);
      } catch (error) {
        console.error('Encryption error:', error);
        throw error;
      }
    };

    function isPouchNotFoundError(error) {
      return error && (error.status === 404 || error.name === 'not_found');
    }

    luamDB.get = async function(id, options = {}) {
      try {
        const doc = await originalGet(id, options);

        if (doc._encrypted && doc.data) {
          try {
            const decryptedData = await decryptData(doc.data);
            return {
              ...decryptedData,
              _id: doc._id,
              _rev: doc._rev
            };
          } catch (decryptError) {
            console.error('Decryption error:', decryptError);
            throw decryptError;
          }
        }

        return doc;
      } catch (error) {
        if (isPouchNotFoundError(error)) {
          if (Object.prototype.hasOwnProperty.call(options, 'default')) {
            return options.default;
          }
          throw error;
        }
        console.error('Database read error:', error);
        throw error;
      }
    };

    luamDB.allDocs = async function(options) {
      try {
        const result = await originalAllDocs(options);

        // Decrypt all documents in the result
        const decryptedRows = await Promise.all(
          result.rows.map(async (row) => {
            if (row.doc && row.doc._encrypted && row.doc.data) {
              try {
                const decryptedData = await decryptData(row.doc.data);
                return {
                  ...row,
                  doc: {
                    ...decryptedData,
                    _id: row.doc._id,
                    _rev: row.doc._rev
                  }
                };
              } catch (decryptError) {
                console.warn('Skipping unreadable encrypted document:', row.doc._id, decryptError);
                return row;
              }
            }
            return row;
          })
        );

        return {
          ...result,
          rows: decryptedRows
        };
      } catch (error) {
        console.error('Batch decryption error:', error);
        throw error;
      }
    };

    // Helper function to generate document ID
    function generateDocumentId(type) {
      const clientPrefs = localStorage.getItem('luam_client_prefs');
      let anonymousId = 'anonymous';
      
      if (clientPrefs) {
        try {
          const prefs = JSON.parse(clientPrefs);
          anonymousId = prefs.sageId || 'anonymous';
        } catch (e) {
          console.error('Error parsing client preferences:', e);
        }
      }

      const timestamp = Date.now();
      return `${anonymousId}_${type}_${timestamp}`;
    }

    // Mood Reflection Storage
    async function saveMoodReflection(moodData) {
      try {
        const docId = generateDocumentId('mood');
        const reflection = {
          _id: docId,
          type: 'mood_reflection',
          mood: moodData.mood,
          intensity: moodData.intensity || 5,
          notes: moodData.notes || '',
          timestamp: new Date().toISOString(),
          sageId: localStorage.getItem('luam_client_prefs') ? JSON.parse(localStorage.getItem('luam_client_prefs')).sageId : null
        };

        await luamDB.put(reflection);
        console.log('Mood reflection saved successfully:', docId);
        if (window.refreshOverviewMetrics) {
          window.refreshOverviewMetrics();
        }
        return docId;
      } catch (error) {
        console.error('Error saving mood reflection:', error);
        throw error;
      }
    }

    // Overview reactivity and local-first summary wiring
    function normalizeDate(value) {
      return value instanceof Date ? value : new Date(value);
    }

    function formatAppointmentLabel(date) {
      if (!date) {
        return 'Next: None Scheduled';
      }
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = days[date.getDay()];
      let hour = date.getHours();
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `Next: ${dayName} ${hour}${ampm}`;
    }

    function calculateProgressImprovement(entries) {
      if (!entries || entries.length < 2) return 0;
      const baseline = entries[0];
      const latest = entries[entries.length - 1];
      const metrics = ['mood', 'sleep', 'energy'];
      const improvements = metrics.map(metric => ((latest[metric] - baseline[metric]) / 10) * 100);
      const average = Math.round(improvements.reduce((sum, value) => sum + value, 0) / metrics.length);
      return Math.max(-100, Math.min(100, average));
    }

    function updateProgressCard(value) {
      const progressEl = document.getElementById('progressValue');
      const progressBarFill = document.getElementById('progressBarFill');
      if (progressEl) {
        progressEl.textContent = `${value > 0 ? '+' : ''}${value}% avg`;
      }
      if (progressBarFill) {
        progressBarFill.style.width = `${Math.min(100, Math.max(0, Math.abs(value)))}%`;
        progressBarFill.style.background = value < 0 ? '#ef4444' : '#87A96B';
      }
    }

    function loadBookingTransactions() {
      return new Promise((resolve) => {
        const request = indexedDB.open('LuamPayments', 1);
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('transactions')) {
            db.createObjectStore('transactions', { keyPath: 'id' });
          }
        };

        request.onsuccess = (event) => {
          const db = event.target.result;
          const tx = db.transaction(['transactions'], 'readonly');
          const store = tx.objectStore('transactions');
          const getAll = store.getAll();
          getAll.onsuccess = () => resolve(getAll.result || []);
          getAll.onerror = () => resolve([]);
        };

        request.onerror = () => resolve([]);
      });
    }

    async function readAllPouchDocs() {
      if (!luamDB || !luamDB.allDocs) {
        return [];
      }
      try {
        const result = await luamDB.allDocs({ include_docs: true });
        return result.rows.map(row => row.doc).filter(Boolean);
      } catch (error) {
        console.error('readAllPouchDocs failed:', error);
        return [];
      }
    }

    function parseBookingDateTime(dateString, timeString) {
      if (!dateString || !timeString) return null;
      const parsed = new Date(`${dateString} ${timeString}`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    function formatBookingCard(booking) {
      const dateObj = parseBookingDateTime(booking.date, booking.time);
      if (!dateObj) return '<div class="booking-card">Invalid booking</div>';
      const dateDisplay = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const timeDisplay = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `
        <article class="booking-card" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(148,163,184,0.14); border-radius: 18px; padding: 18px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
            <div>
              <p style="margin:0;color:#f8fafc;font-weight:700;">${escapeHtml(booking.meetingType || 'Booking')}</p>
              <small style="color:#94a3b8;">${escapeHtml(booking.name || 'Guest')}</small>
            </div>
            <span style="color:#87a96b;font-weight:700;">${escapeHtml(booking.status || 'booked')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="color:#cbd5e1;">${dateDisplay}</span>
            <span style="color:#cbd5e1;">${timeDisplay}</span>
          </div>
          <p style="margin:0;color:#94a3b8;font-size:0.93rem;line-height:1.5;">${escapeHtml(booking.contact || 'No contact')} · ${escapeHtml(booking.meetingType || 'Virtual')}</p>
        </article>
      `;
    }

    function renderUpcomingSessions(upcomingAppointments) {
      const container = document.getElementById('upcomingSessionsList');
      if (!container) return;
      if (!upcomingAppointments.length) {
        container.innerHTML = `
          <div style="padding:24px; border-radius:18px; background: rgba(255,255,255,0.06); border: 1px solid rgba(148,163,184,0.14); color: #cbd5e1; text-align:center;">
            No upcoming sessions yet. Book a session from the panel above.
          </div>
        `;
        return;
      }

      container.innerHTML = upcomingAppointments.slice(0, 6).map(formatBookingCard).join('');
    }

    function countRecentDocs(docs, days, timestampFields = ['timestamp', 'createdAt', 'date', 'entryDate']) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return docs.filter(doc => {
        const rawDate = timestampFields.map(field => doc[field]).find(Boolean);
        const parsed = rawDate ? new Date(rawDate) : null;
        return parsed instanceof Date && !Number.isNaN(parsed.getTime()) && parsed > cutoff;
      }).length;
    }

    async function refreshOverviewMetrics() {
      try {
        const docs = await readAllPouchDocs();
        const completedSessions = docs.filter(doc => doc.status === 'completed' && (doc.type === 'session' || doc.type === 'therapy_session' || doc.type === 'appointment')).length;
        const journalDocs = docs.filter(doc => doc.type === 'journal_entry' || doc.type === 'journal' || doc.journalText || doc.entryDate);
        const completedJournalCountFromPouch = journalDocs.filter(doc => doc.completed === true || doc.status === 'completed' || !('completed' in doc)).length;
        // include localStorage journal entries as fallback
        let localJournalEntries = [];
        try {
          localJournalEntries = JSON.parse(localStorage.getItem('luam_journal_entries') || '[]');
        } catch (e) { localJournalEntries = []; }
        const completedJournalCount = completedJournalCountFromPouch + (localJournalEntries.length || 0);
        const sessionsThisMonth = countRecentDocs(docs.filter(doc => doc.status === 'completed' && (doc.type === 'session' || doc.type === 'therapy_session' || doc.type === 'appointment')), 30);
        const journalThisWeek = countRecentDocs(journalDocs, 7);

        const bookingTransactions = await loadBookingTransactions();
        const upcomingAppointments = bookingTransactions
          .map(tx => ({ ...tx, dateTime: parseBookingDateTime(tx.date, tx.time) }))
          .filter(tx => tx.dateTime && tx.dateTime > new Date())
          .sort((a, b) => a.dateTime - b.dateTime);

        const sessionsEl = document.getElementById('sessionsValue');
        const appointmentsEl = document.getElementById('appointmentsValue');
        const journalEl = document.getElementById('journalValue');
        const sessionsTrendEl = document.getElementById('sessionsTrend');
        const appointmentSubtitleEl = document.getElementById('appointmentSubtitle');
        const journalTrendEl = document.getElementById('journalTrend');

        if (sessionsEl) sessionsEl.textContent = String(completedSessions);
        if (journalEl) journalEl.textContent = String(completedJournalCount);
        if (appointmentsEl) appointmentsEl.textContent = String(upcomingAppointments.length);
        if (appointmentSubtitleEl) appointmentSubtitleEl.textContent = formatAppointmentLabel(upcomingAppointments[0]?.dateTime);
        renderUpcomingSessions(upcomingAppointments);
        if (sessionsTrendEl) {
          sessionsTrendEl.textContent = sessionsThisMonth > 0
            ? `+${sessionsThisMonth} this month`
            : 'No completed sessions this month';
        }
        if (journalTrendEl) {
          journalTrendEl.textContent = journalThisWeek > 0
            ? `+${journalThisWeek} this week`
            : 'No new entries this week';
        }

        const selfCheckins = docs
          .filter(doc => doc.type === 'mood_reflection' || doc.mood_score || doc.mood || doc.intensity || doc.sleep_hours || doc.sleep || doc.energy_level || doc.energy)
          .map(doc => ({
            date: normalizeDate(doc.timestamp),
            mood: Number(doc.mood_score || doc.mood || doc.intensity || 5),
            sleep: Number(doc.sleep_hours || doc.sleep || 7),
            energy: Number(doc.energy_level || doc.energy || 5)
          }))
          .sort((a, b) => a.date - b.date);

        updateProgressCard(calculateProgressImprovement(selfCheckins));
        await updateSymmetryChart();
      } catch (error) {
        console.error('refreshOverviewMetrics failed:', error);
      }
    }

    function setupOverviewReactivity() {
      if (luamDB && luamDB.changes) {
        luamDB.changes({ since: 'now', live: true, include_docs: true })
          .on('change', refreshOverviewMetrics)
          .on('error', (err) => console.error('Overview observer error:', err));
      }

      refreshOverviewMetrics();
      setInterval(refreshOverviewMetrics, 3000);
    }

    // Sync Infrastructure (Offline-Only for now)
    const syncConfig = {
      remoteUrl: null, // Will be configured for future remote sync
      live: true,
      retry: true
    };

    function enableRemoteSync(remoteUrl) {
      syncConfig.remoteUrl = remoteUrl;
      console.log('Remote sync enabled:', remoteUrl);
    }

    // Initialize PouchDB on page load
    document.addEventListener('DOMContentLoaded', async function() {
      try {
        // Test database connection
        await luamDB.info();
        console.log('Luam Local Vault initialized successfully');
        
        // Setup real-time overview updates
        setupOverviewReactivity();
      } catch (error) {
        console.error('Error initializing Luam Local Vault:', error);
      }
    });

    // Sage Idle Detection
    let sageIdleTimer = null;
    let isSageLocked = false;
    
    // Sage Support Functions
    function openSageSupport() {
      document.getElementById('sageSupportModal').classList.add('active');
    }
    
    function closeSageSupport() {
      document.getElementById('sageSupportModal').classList.remove('active');
    }
    
    // Sage Auto-Lock Functions
    function lockSageScreen() {
      if (isSageLocked) return;
      
      isSageLocked = true;
      document.getElementById('sageWelcomeOverlay').classList.add('active');
    }
    
    function returnToDashboard() {
      isSageLocked = false;
      document.getElementById('sageWelcomeOverlay').classList.remove('active');
      resetSageIdleTimer();
    }
    
    function resetSageIdleTimer() {
      clearTimeout(sageIdleTimer);
      sageIdleTimer = setTimeout(lockSageScreen, 120000); // 120 seconds
    }
    
    function setupSageIdleDetection() {
      // Reset timer on user activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      events.forEach(event => {
        document.addEventListener(event, resetSageIdleTimer, true);
      });
      
      resetSageIdleTimer();
    }
    
    // Tabbed Pattern Viewer - Symmetry Hero
    let currentSymmetryTab = 'mood';
    let symmetryChart = null;
    let symmetryChartGeneration = 0;
    let cachedLabels = [];
    let sageMoodChart = null;
    let sageMoodData = [5, 5, 5, 5, 5, 5, 5];

    function updateSageChart() {
      if (!sageMoodChart) return;
      sageMoodChart.data.datasets[0].data = sageMoodData;
      sageMoodChart.update('none');
    }

    const defaultSymmetryData = {
      mood: { labels: ['3 days ago', '2 days ago', 'Yesterday', 'Today'], data: [6, 7, 5, 8], color: '#87A96B' },
      sleep: { labels: ['3 days ago', '2 days ago', 'Yesterday', 'Today'], data: [7, 6, 8, 7], color: '#3B82F6' },
      energy: { labels: ['3 days ago', '2 days ago', 'Yesterday', 'Today'], data: [5, 6, 7, 6], color: '#F59E0B' },
      momentum: { labels: ['3 days ago', '2 days ago', 'Yesterday', 'Today'], data: [3, 4, 5, 0], color: '#87A96B' }
    };

    function destroySymmetryChart() {
      const canvas = document.getElementById('symmetryChart');
      if (canvas) {
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
          existingChart.destroy();
        }
      }
      if (symmetryChart) {
        symmetryChart.destroy();
        symmetryChart = null;
      }
    }

    async function switchSymmetryTab(tabName) {
      const generation = ++symmetryChartGeneration;

      document.querySelectorAll('.symmetry-tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
          tab.style.color = '#87A96B';
          tab.style.opacity = '1';
        } else {
          tab.style.color = '#5A6B73';
          tab.style.opacity = '0.7';
        }
      });

      currentSymmetryTab = tabName;
      const chartLegend = document.getElementById('chartLegend');
      if (chartLegend) {
        chartLegend.style.display = tabName === 'all' ? 'flex' : 'none';
      }

      const canvas = document.getElementById('symmetryChart');
      if (!canvas) return;
      destroySymmetryChart();

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const moodData = await fetchSymmetryDataFromPouchDB('mood');
      const sleepData = await fetchSymmetryDataFromPouchDB('sleep');
      const energyData = await fetchSymmetryDataFromPouchDB('energy');
      const momentumData = await fetchSymmetryDataFromPouchDB('momentum');
      const labels = cachedLabels.length ? cachedLabels : defaultSymmetryData.mood.labels;

      if (generation !== symmetryChartGeneration) return;

      const hasData = await hasSymmetryDataInPouchDB(tabName);
      if (!hasData) {
        clearSymmetryFallbackMessage();
        renderSymmetryFallbackMessage(tabName);
        return;
      }

      if (generation !== symmetryChartGeneration) return;

      if (tabName === 'all') {
        symmetryChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              buildDataset('Mood', moodData, '#87A96B'),
              buildDataset('Sleep', sleepData, '#3B82F6'),
              buildDataset('Energy', energyData, '#F59E0B')
            ]
          },
          options: chartOptions()
        });
        return;
      }

      clearSymmetryFallbackMessage();
      const config = {
        mood: { data: moodData, color: '#87A96B', label: 'Mood' },
        sleep: { data: sleepData, color: '#3B82F6', label: 'Sleep' },
        energy: { data: energyData, color: '#F59E0B', label: 'Energy' },
        momentum: { data: momentumData, color: '#9333EA', label: 'Momentum' }
      }[tabName] || { data: moodData, color: '#87A96B', label: 'Mood' };

      symmetryChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [buildDataset(config.label, config.data, config.color)]
        },
        options: chartOptions()
      });
    }

    async function updateSymmetryChart() {
      const hasData = await hasSymmetryDataInPouchDB(currentSymmetryTab);
      if (!hasData) {
        destroySymmetryChart();
        clearSymmetryFallbackMessage();
        renderSymmetryFallbackMessage(currentSymmetryTab);
        return;
      }

      clearSymmetryFallbackMessage();

      if (!symmetryChart) {
        return switchSymmetryTab(currentSymmetryTab);
      }

      const moodData = await fetchSymmetryDataFromPouchDB('mood');
      const sleepData = await fetchSymmetryDataFromPouchDB('sleep');
      const energyData = await fetchSymmetryDataFromPouchDB('energy');
      const momentumData = await fetchSymmetryDataFromPouchDB('momentum');
      const labels = cachedLabels.length ? cachedLabels : defaultSymmetryData.mood.labels;

      symmetryChart.data.labels = labels;

      if (currentSymmetryTab === 'all') {
        symmetryChart.data.datasets = [
          buildDataset('Mood', moodData, '#87A96B'),
          buildDataset('Sleep', sleepData, '#3B82F6'),
          buildDataset('Energy', energyData, '#F59E0B')
        ];
      } else {
        const config = {
          mood: { data: moodData, color: '#87A96B', label: 'Mood' },
          sleep: { data: sleepData, color: '#3B82F6', label: 'Sleep' },
          energy: { data: energyData, color: '#F59E0B', label: 'Energy' },
          momentum: { data: momentumData, color: '#9333EA', label: 'Momentum' }
        }[currentSymmetryTab] || { data: moodData, color: '#87A96B', label: 'Mood' };
        symmetryChart.data.datasets = [buildDataset(config.label, config.data, config.color)];
      }

      symmetryChart.update('none');
    }

    function buildDataset(label, data, color) {
      return {
        label,
        data: data.length ? data : defaultSymmetryData[label.toLowerCase()]?.data || [],
        borderColor: color,
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: color
      };
    }

    function chartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0,0,0,0.85)',
            titleColor: '#f9f9fb',
            bodyColor: '#f9f9fb',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 12
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            min: 0,
            max: 10,
            grid: { color: 'rgba(255,255,255,0.06)' }
          }
        },
        interaction: { mode: 'index', intersect: false }
      };
    }

    function clearSymmetryFallbackMessage() {
      const existing = document.getElementById('symmetryFallbackMessage');
      if (existing) {
        existing.remove();
      }
    }

    function renderSymmetryFallbackMessage(tabName) {
      clearSymmetryFallbackMessage();
      const canvas = document.getElementById('symmetryChart');
      if (!canvas || !canvas.parentElement) return;
      const wrapper = canvas.parentElement;
      wrapper.style.position = 'relative';
      const message = document.createElement('div');
      message.id = 'symmetryFallbackMessage';
      message.style.cssText = 'position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; border-radius: 22px; background: rgba(255, 253, 248, 0.94); color: #5f6f66; font-size: 0.95rem; line-height: 1.6; text-align: center; border: 1px solid rgba(51,64,58,0.08); z-index: 10; pointer-events: auto;';
      const title = document.createElement('div');
      title.style.marginBottom = '16px';
      title.innerHTML = tabName === 'momentum'
        ? 'No momentum activity found yet.'
        : 'No self check-in history found yet.';
      const details = document.createElement('div');
      details.style.marginBottom = '18px';
      details.innerHTML = tabName === 'momentum'
        ? 'Visit the <strong>Mind Hub</strong> utility to begin tracking your progress.'
        : 'Use the <strong>Self Check-In</strong> utility to capture mood, energy, and sleep data.';
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.flexWrap = 'wrap';
      actions.style.justifyContent = 'center';
      actions.style.gap = '10px';

      const selfCheckButton = document.createElement('button');
      selfCheckButton.type = 'button';
      selfCheckButton.textContent = 'Go to Self Check-In';
      selfCheckButton.style.cssText = 'padding: 10px 18px; border-radius: 999px; border: none; background: rgba(135,169,107,0.95); color: #0f172a; cursor: pointer; font-weight: 700; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12); pointer-events: auto;';
      selfCheckButton.onclick = () => openUtilitySection('selfCheckin');

      const momentumButton = document.createElement('button');
      momentumButton.type = 'button';
      momentumButton.textContent = 'Go to Mind Hub';
      momentumButton.style.cssText = 'padding: 10px 18px; border-radius: 999px; border: 1px solid rgba(124,154,106,0.45); background: transparent; color: #5f7d50; cursor: pointer; font-weight: 700; pointer-events: auto;';
      momentumButton.onclick = () => openUtilitySection('cognitiveMomentum');

      actions.appendChild(selfCheckButton);
      actions.appendChild(momentumButton);
      message.appendChild(title);
      message.appendChild(details);
      message.appendChild(actions);
      wrapper.appendChild(message);
    }

    async function hasSymmetryDataInPouchDB(tabName) {
      try {
        const docs = await readAllPouchDocs();
        if (tabName === 'momentum') {
          return docs.some(doc => doc.type === 'momentum_point' || doc.momentumScore || doc.score || doc.value);
        }
        return docs.some(doc => doc.timestamp && (doc.mood_score || doc.mood || doc.intensity || doc.sleep_hours || doc.sleep || doc.energy_level || doc.energy));
      } catch (error) {
        console.error('hasSymmetryDataInPouchDB failed:', error);
        return false;
      }
    }

    function openUtilitySection(utilityId) {
      try {
        toggleUtilityExpanded(utilityId);
        const section = document.getElementById(utilityId + 'Expanded');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (error) {
        console.error('openUtilitySection failed:', error);
      }
    }

    async function fetchSymmetryDataFromPouchDB(tabName) {
      try {
        const docs = await readAllPouchDocs();
        const checkins = docs
          .filter(doc => doc.timestamp && (doc.mood_score || doc.mood || doc.intensity || doc.sleep_hours || doc.sleep || doc.energy_level || doc.energy))
          .map(doc => ({
            date: normalizeDate(doc.timestamp),
            mood: Number(doc.mood_score || doc.mood || doc.intensity || 5),
            sleep: Number(doc.sleep_hours || doc.sleep || 7),
            energy: Number(doc.energy_level || doc.energy || 5)
          }))
          .sort((a, b) => a.date - b.date)
          .slice(-7);

        if (checkins.length) {
          cachedLabels = checkins.map(entry => entry.date.toLocaleDateString('en-US', { weekday: 'short' }));
        }

        if (tabName === 'momentum') {
          const momentum = docs
            .filter(doc => doc.type === 'momentum_point' || doc.momentumScore || doc.score || doc.value)
            .map(doc => Number(doc.value || doc.score || 1))
            .slice(-7);
          return momentum.length ? momentum : defaultSymmetryData.momentum.data;
        }

        if (!checkins.length) {
          return defaultSymmetryData[tabName]?.data || [];
        }

        const mapping = {
          mood: checkins.map(entry => entry.mood),
          sleep: checkins.map(entry => entry.sleep),
          energy: checkins.map(entry => entry.energy)
        };

        return mapping[tabName] || defaultSymmetryData[tabName]?.data || [];
      } catch (error) {
        console.error('PouchDB query error:', error);
        return defaultSymmetryData[tabName]?.data || [];
      }
    }

    function initializeSymmetryChart() {
      return switchSymmetryTab('mood');
    }

    window.switchSymmetryTab = switchSymmetryTab;
    window.updateSymmetryChart = updateSymmetryChart;
    window.refreshOverviewMetrics = refreshOverviewMetrics;

    // Original dashboard functions (simplified versions)
    function checkAuthentication() {
      const isAuthenticated = localStorage.getItem('luamAuthenticated');
      const userData = localStorage.getItem('luamUser');
      
      if (!isAuthenticated || !userData) {
        localStorage.setItem('luamAuthenticated', 'true');
        localStorage.setItem('luamUser', JSON.stringify({
          fullName: 'Jordan Hale',
          email: 'jordan@luam.com',
          phone: '+15551234567',
          loginMethod: 'bypass'
        }));
      }
      
      return true;
    }

    function showToast(message, type = 'success') {
      const colors = {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      };
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.error};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 0.875rem;
        z-index: 4001;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      toast.textContent = message;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = '1';
      }, 100);
      
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    }

    // Mood tracking - Section removed, keeping code for reference
    let lastMoodUpdate = 0;
    const MOOD_UPDATE_COOLDOWN = 5000;

    const moodButtons = document.querySelectorAll(".mood-btn");
    const moodStatus = document.getElementById("moodStatus");
    
    function selectMood(btn) {
      if (!moodStatus) return;
      const now = Date.now();
      if (now - lastMoodUpdate < MOOD_UPDATE_COOLDOWN) {
        showToast('Please wait a moment before updating your mood again.', 'error');
        return;
      }
      
      moodButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const mood = btn.dataset.mood;
      moodStatus.textContent = `Current mood: ${mood}`;
      localStorage.setItem("luamMood", mood);
      lastMoodUpdate = now;
      showToast(`Great! You're feeling ${mood}.`, 'success');
      
      if (sageMoodChart) {
        const moodScore = Math.floor(Math.random() * 10) + 5;
        sageMoodData.shift();
        sageMoodData.push(moodScore);
        updateSageChart();
      }
      resetSageIdleTimer();
    }

    // Journal functionality - Section removed, keeping code for reference
    const journalText = document.getElementById("journalText");
    const journalCounter = document.getElementById("journalCounter");
    const journalStatus = document.getElementById("journalStatus");
    const saveJournalBtn = document.getElementById("saveJournalBtn");
    let autoSaveTimeout;

    if (journalText && journalCounter && journalStatus) {
      journalText.addEventListener("input", () => {
        const count = journalText.value.length;
        journalCounter.textContent = `${count}/2000`;
        
        if (count > 1800) {
          journalCounter.classList.add("high");
        } else {
          journalCounter.classList.remove("high");
        }

        clearTimeout(autoSaveTimeout);
        journalStatus.style.opacity = '0';
        if (count > 0) {
          autoSaveTimeout = setTimeout(() => {
            autoSaveJournal();
          }, 1500);
        }
      });
    }

    function autoSaveJournal() {
      if (!journalText || !journalStatus) return;
      const stamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const encryptedData = btoa(journalText.value.trim());
      localStorage.setItem("luamJournalDraft", encryptedData);
      localStorage.setItem("luamJournalTime", stamp);
      
      journalStatus.style.opacity = '1';
      journalStatus.style.animation = 'fadeIn 0.3s ease-out';
    }

    if (saveJournalBtn) {
      saveJournalBtn.addEventListener("click", () => {
        if (!journalText || !journalText.value.trim()) {
          showToast('Please add content before saving.', 'error');
          return;
        }

        autoSaveJournal();
        saveJournalEntry().then(() => {
          showToast("Entry saved successfully!", 'success');
        }).catch(err => {
          console.error('saveJournalEntry failed:', err);
          showToast('Failed to save entry.', 'error');
        });
        resetSageIdleTimer();
      });
    }

    async function saveJournalEntry() {
      try {
        const textEl = document.getElementById('journalText');
        if (!textEl) return null;
        const content = textEl.value.trim();
        if (!content) return null;

        const docId = generateDocumentId('journal');
        const doc = {
          _id: docId,
          type: 'journal_entry',
          journalText: content,
          entryDate: new Date().toISOString(),
          sageId: localStorage.getItem('luam_client_prefs') ? JSON.parse(localStorage.getItem('luam_client_prefs')).sageId : null
        };
        if (luamDB && luamDB.put) {
          await luamDB.put(doc);
        } else {
          const existing = JSON.parse(localStorage.getItem('luam_journal_entries') || '[]');
          existing.push(doc);
          localStorage.setItem('luam_journal_entries', JSON.stringify(existing));
        }
        if (window.refreshOverviewMetrics) window.refreshOverviewMetrics();
        return docId;
      } catch (error) {
        console.error('saveJournalEntry error:', error);
        throw error;
      }
    }

    async function fetchAllJournalEntries() {
      try {
        if (luamDB && luamDB.allDocs) {
          const res = await luamDB.allDocs({ include_docs: true });
          return res.rows.map(r => r.doc).filter(d => d && (d.type === 'journal_entry' || d.type === 'journal'))
            .sort((a,b) => new Date(a.entryDate) - new Date(b.entryDate));
        }
        const local = JSON.parse(localStorage.getItem('luam_journal_entries') || '[]');
        // Normalize legacy reflection.html entries ({id, content, timestamp}) to {journalText, entryDate}
        const normalized = local.map(item => {
          if (item && (item.journalText || item.entryDate)) return item;
          return {
            journalText: item.content || item.journalText || '',
            entryDate: item.entryDate || item.timestamp || item.time || new Date().toISOString()
          };
        });
        return normalized.sort((a,b) => new Date(a.entryDate) - new Date(b.entryDate));
      } catch (e) {
        console.error('fetchAllJournalEntries failed:', e);
        return [];
      }
    }

    function showJournalViewer() {
      const overlayId = 'journalViewerOverlay';
      const existing = document.getElementById(overlayId);
      if (existing) return;
      const overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(2,6,23,0.7); display:flex; align-items:center; justify-content:center; z-index:10050; padding: 20px;';
      const box = document.createElement('div');
      box.style.cssText = 'width: min(900px, 96%); max-height: 86%; overflow: auto; background: white; border-radius: 12px; padding: 18px;';
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      closeBtn.style.cssText = 'float:right; padding:6px 12px; margin-bottom:12px;';
      closeBtn.onclick = () => overlay.remove();
      box.appendChild(closeBtn);
      const title = document.createElement('h3');
      title.textContent = 'Journal — All Entries';
      title.style.marginBottom = '12px';
      box.appendChild(title);
      const list = document.createElement('div');
      list.style.display = 'flex';
      list.style.flexDirection = 'column';
      list.style.gap = '12px';
      box.appendChild(list);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      fetchAllJournalEntries().then(entries => {
        if (!entries.length) {
          const p = document.createElement('div');
          p.textContent = 'No journal entries yet.';
          list.appendChild(p);
          return;
        }
        entries.forEach(e => {
          const item = document.createElement('div');
          item.style.cssText = 'padding:12px; border-radius:8px; background:#f8fafc; border:1px solid #e6eef0;';
          const d = document.createElement('div');
          d.style.fontSize = '0.9rem';
          d.style.color = '#334155';
          d.textContent = new Date(e.entryDate).toLocaleString();
          const content = document.createElement('div');
          content.style.marginTop = '6px';
          content.style.whiteSpace = 'pre-wrap';
          content.textContent = e.journalText || e.content || '';
          item.appendChild(d);
          item.appendChild(content);
          list.appendChild(item);
        });
      }).catch(err => {
        list.textContent = 'Failed to load entries.';
        console.error(err);
      });
    }

    // Placeholder functions for screening tools
    function startScreening(tool) {
      showToast(`Starting ${tool} reflection...`, 'success');
      resetSageIdleTimer();
    }

    function showToolInfo(tool) {
      showToast(`Information about ${tool}`, 'info');
    }

    function exportScreeningData() {
      showToast('Downloading insights...', 'success');
    }

    function clearAllScreeningData() {
      if (confirm('Are you sure you want to clear all screening data?')) {
        showToast('Screening data cleared', 'success');
      }
    }

    // M-Pesa STK Push Integration
    let selectedDate = null;
    let selectedTime = null;
    
    // Generate booking dates (next 7 days)
    function generateBookingDates() {
      const dateGrid = document.getElementById('dateGrid');
      const today = new Date();
      const dates = [];
      
      for (let i = 1; i <= 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date);
      }
      
      dateGrid.innerHTML = dates.map(date => {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = date.getDate();
        const dateStr = date.toISOString().split('T')[0];
        return `<div class="booking-slot" data-date="${dateStr}" onclick="selectDate('${dateStr}')">
          <div style="font-size: 0.75rem; color: #64748b;">${dayName}</div>
          <div style="font-weight: 500;">${dayNum}</div>
        </div>`;
      }).join('');
    }
    
    // Generate booking times
    function generateBookingTimes() {
      const timeGrid = document.getElementById('timeGrid');
      const times = [
        '9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', 
        '3:00 PM', '4:00 PM', '5:00 PM'
      ];
      
      timeGrid.innerHTML = times.map(time => 
        `<div class="booking-slot" data-time="${time}" onclick="selectTime('${time}')">${time}</div>`
      ).join('');
    }
    
    // Date selection
    function selectDate(date) {
      selectedDate = date;
      document.querySelectorAll('#dateGrid .booking-slot').forEach(slot => 
        slot.classList.remove('selected'));
      document.querySelector(`[data-date="${date}"]`).classList.add('selected');
      updateSelectedDateTime();
    }
    
    // Time selection
    function selectTime(time) {
      selectedTime = time;
      document.querySelectorAll('#timeGrid .booking-slot').forEach(slot => 
        slot.classList.remove('selected'));
      document.querySelector(`[data-time="${time}"]`).classList.add('selected');
      updateSelectedDateTime();
    }
    
    // Update selected date/time display
    function updateSelectedDateTime() {
      const selectedEl = document.getElementById('selectedDateTime');
      const mpesaBtn = document.getElementById('mpesaPaymentBtn');
      
      if (selectedDate && selectedTime) {
        const date = new Date(selectedDate);
        const dateStr = date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        selectedEl.textContent = `${dateStr} at ${selectedTime}`;
        mpesaBtn.disabled = false;
      } else {
        selectedEl.textContent = 'Please select a date and time';
        mpesaBtn.disabled = true;
      }
    }
    
    // M-Pesa STK Push Implementation
    async function initiateMpesaPayment() {
      showToast('M-Pesa booking is currently under maintenance.', 'warning');
      return;

      if (!selectedDate || !selectedTime) {
        showToast('Please select both date and time', 'error');
        return;
      }
      
      const phoneNumber = localStorage.getItem('luamUserPhone') || '+254712345678';
      const amount = 2500;
      const accountReference = `LUAM-${Date.now()}`;
      const transactionDesc = 'Therapy Session Booking';
      
      try {
        // Show processing state
        const btn = document.getElementById('mpesaPaymentBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Processing...';
        btn.disabled = true;
        
        // Call Cloudflare Worker for M-Pesa STK Push
        const response = await fetch('https://your-worker.workers.dev/mpesa-stk-push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: phoneNumber,
            amount: amount,
            accountReference: accountReference,
            transactionDesc: transactionDesc,
            transactionType: 'booking',
            patientId: localStorage.getItem('symmetrySageId') || 'LUAM-PATIENT'
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          showToast('M-Pesa prompt sent to your phone', 'success');
          
          // Store transaction in IndexedDB
          await storeTransaction({
            id: accountReference,
            amount: amount,
            date: selectedDate,
            time: selectedTime,
            status: 'pending',
            timestamp: new Date().toISOString()
          });
          
          // Monitor payment status
          monitorPaymentStatus(accountReference);
        } else {
          showToast('Payment initiation failed: ' + (result.message || 'Unknown error'), 'error');
          btn.textContent = originalText;
          btn.disabled = false;
        }
        
      } catch (error) {
        console.error('M-Pesa payment error:', error);
        showToast('Payment failed. Please try again.', 'error');
        const btn = document.getElementById('mpesaPaymentBtn');
        btn.textContent = 'Pay with M-Pesa';
        btn.disabled = false;
      }
    }
    
    // Monitor payment status and handle success
    async function monitorPaymentStatus(accountReference) {
      const maxAttempts = 30;
      let attempts = 0;
      
      const checkStatus = async () => {
        if (attempts >= maxAttempts) {
          showToast('Payment verification timeout', 'error');
          return;
        }
        
        try {
          const response = await fetch(`https://your-worker.workers.dev/payment-status/${accountReference}`);
          const result = await response.json();
          
          if (result.status === 'completed' && result.resultCode === '0') {
            // Payment successful - save license to PouchDB
            await saveLicenseToPouchDB({
              license_key: result.licenseKey,
              payment_status: 'active',
              accountReference: accountReference,
              timestamp: new Date().toISOString()
            });
            
            // Update UI to show Luam Verified badge
            showLuamVerifiedBadge();
            
            showToast('Payment successful! Luam Verified', 'success');
            
            // Reset button
            const btn = document.getElementById('mpesaPaymentBtn');
            btn.textContent = 'Paid';
            btn.disabled = true;
            btn.style.background = '#22C55E';
            
          } else if (result.status === 'failed') {
            showToast('Payment failed', 'error');
            const btn = document.getElementById('mpesaPaymentBtn');
            btn.textContent = 'Pay with M-Pesa';
            btn.disabled = false;
          } else {
            // Still pending, check again
            attempts++;
            setTimeout(checkStatus, 3000);
          }
        } catch (error) {
          console.error('Status check error:', error);
          attempts++;
          setTimeout(checkStatus, 3000);
        }
      };
      
      setTimeout(checkStatus, 5000);
    }
    
    // Save license to PouchDB
    async function saveLicenseToPouchDB(licenseData) {
      try {
        await luamDB.put({
          _id: 'license_' + licenseData.accountReference,
          type: 'license',
          license_key: licenseData.license_key,
          payment_status: licenseData.payment_status,
          accountReference: licenseData.accountReference,
          timestamp: licenseData.timestamp
        });
        console.log('License saved to PouchDB');
      } catch (error) {
        console.error('Error saving license to PouchDB:', error);
      }
    }
    
    // Show Luam Verified badge in header
    function showLuamVerifiedBadge() {
      // Check if badge already exists
      if (document.getElementById('luamVerifiedBadge')) return;
      
      // Find header and add badge
      const header = document.querySelector('header') || document.querySelector('.glass-card');
      if (header) {
        const badge = document.createElement('div');
        badge.id = 'luamVerifiedBadge';
        badge.style.cssText = `
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #87A96B 0%, #6B8A4F 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          font-family: 'Livvic', sans-serif;
          margin-left: 12px;
          box-shadow: 0 2px 8px rgba(135, 169, 107, 0.3);
        `;
        badge.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
          Luam Verified
        `;
        
        // Insert after the title
        const title = header.querySelector('h1');
        if (title) {
          title.parentNode.insertBefore(badge, title.nextSibling);
        }
      }
    }
    
    // Store transaction in IndexedDB
    async function storeTransaction(transactionData) {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('LuamPayments', 1);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('transactions')) {
            db.createObjectStore('transactions', { keyPath: 'id' });
          }
        };

        request.onsuccess = (event) => {
          const db = event.target.result;
          const tx = db.transaction(['transactions'], 'readwrite');
          const store = tx.objectStore('transactions');
          const addRequest = store.add(transactionData);

          addRequest.onsuccess = () => resolve();
          addRequest.onerror = () => reject(addRequest.error);
        };

        request.onerror = () => reject(request.error);
      });
    }
    
    // Monitor payment status
    function monitorPaymentStatus(transactionId) {
      const checkInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/payment-status/${transactionId}`);
          const result = await response.json();
          
          if (result.status !== 'pending') {
            clearInterval(checkInterval);
            await updateTransactionStatus(transactionId, result.status);
            
            if (result.status === 'completed') {
              showToast('Payment successful! Booking confirmed.', 'success');
              // Reset booking form
              selectedDate = null;
              selectedTime = null;
              updateSelectedDateTime();
            } else {
              showToast('Payment failed. Please try again.', 'error');
            }
          }
        } catch (error) {
          clearInterval(checkInterval);
        }
      }, 3000); // Check every 3 seconds
      
      // Stop checking after 5 minutes
      setTimeout(() => clearInterval(checkInterval), 300000);
    }
    
    // Update transaction status in IndexedDB
    async function updateTransactionStatus(transactionId, status) {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('LuamPayments', 1);
        
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['transactions'], 'readwrite');
          const store = transaction.objectStore('transactions');
          const updateRequest = store.put({
            id: transactionId,
            status: status,
            updatedAt: new Date().toISOString()
          });
          
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        };
        
        request.onerror = () => reject(request.error);
      });
    }
    
    // Transparency Modal Functions
    function openTransparencyModal() {
      const modal = document.getElementById('transparencyModal');
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    
    function closeTransparencyModal() {
      const modal = document.getElementById('transparencyModal');
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    
    function acceptConsent() {
      localStorage.setItem('luam_consent_given', 'true');
      closeTransparencyModal();
      showToast('Thank you for your consent', 'success');
    }

    // Language Toggle Functionality
    let currentLanguage = 'en';

    const translations = {
      en: {
        modalTitle: 'Transparency & Consent',
        disclaimerTitle: 'Wellness Utility Disclaimer',
        disclaimerText: "Luam's Symmetry provides digital tools for self-reflection and mood tracking. These tools are designed to support, not replace, professional mental healthcare. Always consult qualified healthcare providers for clinical decisions.",
        privacyTitle: 'Data Privacy',
        privacyText: 'Your wellness data is stored locally on your device using IndexedDB. We do not access, store, or transmit your personal reflections without explicit consent. Payment processing is handled securely through M-Pesa\'s encrypted API.',
        consentBtn: 'I Understand and Consent',
        langBtn: 'Kiswahili'
      },
      sw: {
        modalTitle: 'Uwazi na Idhini',
        disclaimerTitle: 'Tangazo la Kutoa Huduma za Kiafya',
        disclaimerText: 'Symmetry ya Luam inatoa zana za kidijitali kwa ajili ya kujitathmini na kufuatilia hali yako ya moyo. Zana hizi zimeundwa kusaidia, si kubadilisha, huduma za kiafya za kitaalamu. Daima washauriana na watoa huduma za kiafya waliohitimu kwa maamuzi ya kiafya.',
        privacyTitle: 'Faragha ya Data',
        privacyText: 'Data yako ya kiafya inahifadhiwa kwenye kifaa chako ndani ya IndexedDB. Hatufiki, tunahifadhi, wala kutuma mawazo yako binafsi bila idhini yako wazi. Usindikaji wa malipo unahudumiwa kwa usalama kupitia API iliyofichwa ya M-Pesa.',
        consentBtn: 'Naelewa na Ninakubali',
        langBtn: 'English'
      }
    };

    function toggleLanguage() {
      currentLanguage = currentLanguage === 'en' ? 'sw' : 'en';
      updateModalLanguage();
    }

    function updateModalLanguage() {
      const t = translations[currentLanguage];
      document.getElementById('modalTitle').textContent = t.modalTitle;
      document.getElementById('disclaimerTitle').textContent = t.disclaimerTitle;
      document.getElementById('disclaimerText').textContent = t.disclaimerText;
      document.getElementById('privacyTitle').textContent = t.privacyTitle;
      document.getElementById('privacyText').textContent = t.privacyText;
      document.getElementById('consentBtn').textContent = t.consentBtn;
      document.getElementById('langToggleBtn').textContent = t.langBtn;
    }
    
    // Theme Toggle Functionality
    function setupThemeToggle() {
      const themeToggleBtn = document.getElementById('themeToggleBtn');
      if (!themeToggleBtn) return;
      
      // Check for saved theme preference
      const savedTheme = localStorage.getItem('luam-theme') || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
      updateThemeIcon(savedTheme);
      
      themeToggleBtn.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('luam-theme', newTheme);
        updateThemeIcon(newTheme);
        
        showToast(`Switched to ${newTheme} mode`, 'success');
      });
    }
    
    function updateThemeIcon(theme) {
      const themeToggleBtn = document.getElementById('themeToggleBtn');
      if (!themeToggleBtn) return;
      
      if (theme === 'dark') {
        themeToggleBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;
      } else {
        themeToggleBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
      }
    }
    
    // Mobile Modal Touch Handling
    function setupModalTouchHandlers() {
      // Close transparency modal when clicking outside
      const transparencyModal = document.getElementById('transparencyModal');
      if (transparencyModal) {
        transparencyModal.addEventListener('click', function(e) {
          if (e.target === transparencyModal) {
            closeTransparencyModal();
          }
        });
        
        // Touch events for mobile
        transparencyModal.addEventListener('touchstart', function(e) {
          if (e.target === transparencyModal) {
            closeTransparencyModal();
          }
        });
      }
      
      // Close sage support modal when clicking outside
      const sageSupportModal = document.getElementById('sageSupportModal');
      if (sageSupportModal) {
        sageSupportModal.addEventListener('click', function(e) {
          if (e.target === sageSupportModal) {
            closeSageSupport();
          }
        });
        
        // Touch events for mobile
        sageSupportModal.addEventListener('touchstart', function(e) {
          if (e.target === sageSupportModal) {
            closeSageSupport();
          }
        });
      }
    }
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
      if (!checkAuthentication()) {
        return;
      }
      
      // Setup mobile modal touch handlers
      setupModalTouchHandlers();
      
      // Setup theme toggle functionality
      setupThemeToggle();
      
      // Check for first-time consent
      const consentGiven = localStorage.getItem('luam_consent_given');
      if (!consentGiven) {
        openTransparencyModal();
      }
      
      // Initialize booking picker
      generateBookingDates();
      generateBookingTimes();
      updateSelectedDateTime();
      
      // Initialize charts on window load to ensure everything is ready
      window.addEventListener('load', function() {
        setTimeout(() => {
          initializeSymmetryChart();
        }, 100);
      });
      
      // Setup Sage idle detection
      setupSageIdleDetection();
      
      // Setup mood buttons - Section removed, adding null check
      if (moodButtons.length > 0) {
        moodButtons.forEach((btn, index) => {
          btn.addEventListener("click", () => selectMood(btn));
          btn.setAttribute("aria-label", `Select ${btn.dataset.mood} mood`);
        });
      }
      
      // Restore last mood
      const lastMood = localStorage.getItem("luamMood");
      if (lastMood && moodButtons.length > 0) {
        const lastMoodBtn = document.querySelector(`[data-mood="${lastMood}"]`);
        if (lastMoodBtn) {
          lastMoodBtn.click();
        }
      }
      
      // Restore journal draft - Section removed, adding null check
      const savedDraft = localStorage.getItem("luamJournalDraft");
      const savedTime = localStorage.getItem("luamJournalTime");
      if (savedDraft && journalText && journalCounter && journalStatus) {
        try {
          const decryptedData = atob(savedDraft);
          journalText.value = decryptedData;
          journalCounter.textContent = `${decryptedData.length}/2000`;
          if (savedTime) {
            journalStatus.innerHTML = `<span>✓</span><span>Saved at ${savedTime}</span>`;
            journalStatus.style.opacity = '1';
          }
        } catch (e) {
          localStorage.removeItem("luamJournalDraft");
          localStorage.removeItem("luamJournalTime");
        }
      }
      
      // Close modals on escape
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeSageSupport();
          closeTransparencyModal();
        }
      });
    });

/* ===== BLOCK ===== */

    // Symmetry Identity Card Modal Functionality
    // Simplified BIP39 Word List (first 256 words for demonstration)
    const bip39WordList = [
        "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
        "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
        "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
        "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
        "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert",
        "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter",
        "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger",
        "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique",
        "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic",
        "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest",
        "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset",
        "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction",
        "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake",
        "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge",
        "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "barely", "bargain",
        "barrel", "base", "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become",
        "beef", "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit",
        "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology",
        "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless",
        "blind", "blood", "blossom", "blouse", "blue", "blur", "blush", "board", "boat", "body",
        "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss",
        "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread",
        "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken", "bronze",
        "broom", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb",
        "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst", "bus", "business", "busy",
        "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage", "cake", "call",
        "calm", "camera", "camp", "can", "canal", "cancel", "candy", "cannon", "canoe", "canvas",
        "canyon", "capable", "capital", "captain", "car", "carbon", "card", "cargo", "carpet", "carry",
        "cart", "case", "cash", "casino", "castle", "casual", "cat", "catalog", "catch", "category",
        "cattle", "caught", "cause", "caution", "cave", "ceiling", "celery", "cement", "census", "century",
        "cereal", "certain", "chair", "chalk", "champion", "change", "chaos", "chapter", "charge", "chase",
        "chat", "cheap", "check", "cheese", "chef", "cherry", "chest", "chicken", "chief", "child",
        "chimney", "choice", "choose", "chronic", "chuckle", "chunk", "churn", "cigar", "cinnamon", "circle",
        "citizen", "city", "civil", "claim", "clap", "clarify", "claw", "clay", "clean", "clerk",
        "clever", "click", "client", "cliff", "climb", "clinic", "clip", "clock", "clog", "close",
        "cloth", "cloud", "clown", "club", "clump", "cluster", "clutch", "coach", "coast", "coconut",
        "code", "coffee", "coil", "coin", "collect", "color", "column", "combine", "come", "comfort",
        "comic", "common", "company", "concert", "conduct", "confirm", "congress", "connect", "consider", "control",
        "convince", "cook", "cool", "copper", "copy", "coral", "core", "corn", "corner", "correct",
        "cost", "cotton", "couch", "country", "couple", "course", "cousin", "cover", "coyote", "crack",
        "cradle", "craft", "cram", "crane", "crash", "crater", "crawl", "crazy", "cream", "credit",
        "creek", "crew", "cricket", "crime", "crisp", "critic", "crop", "cross", "crouch", "crowd",
        "crucial", "cruel", "cruise", "crumble", "crunch", "crush", "cry", "crystal", "cube", "culture",
        "cup", "cupboard", "curious", "current", "curtain", "curve", "cushion", "custom", "cute", "cycle",
        "dad", "damage", "damp", "dance", "danger", "daring", "dash", "daughter", "dawn", "day"
    ];

    let recoverySeed = [];
    let verificationIndices = [];

    function generateSageId() {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `SAGE-${timestamp}-${random}`;
    }

    function generateRecoverySeed() {
      if (typeof bip39 !== 'undefined' && typeof bip39.generateMnemonic === 'function') {
        const mnemonic = bip39.wordlists?.english
          ? bip39.generateMnemonic(bip39.wordlists.english, 128)
          : bip39.generateMnemonic(128);
        recoverySeed = mnemonic.trim().split(/\s+/);
        return recoverySeed;
      }

      recoverySeed = [];
      const usedIndices = new Set();
      while (recoverySeed.length < 12) {
        const randomIndex = Math.floor(Math.random() * bip39WordList.length);
        if (!usedIndices.has(randomIndex)) {
          usedIndices.add(randomIndex);
          recoverySeed.push(bip39WordList[randomIndex]);
        }
      }
      return recoverySeed;
    }

    function displaySeed() {
      const seedDisplay = document.getElementById('seedDisplay');
      seedDisplay.innerHTML = '';
      
      recoverySeed.forEach((word, index) => {
        const seedItem = document.createElement('div');
        seedItem.className = 'seed-item';
        seedItem.style.cssText = `
          background: rgba(135, 169, 107, 0.1);
          border: 1px solid #87A96B;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
          font-family: 'Livvic', sans-serif;
          font-size: 14px;
          color: #2F3E46;
        `;
        seedItem.innerHTML = `
          <div style="font-size: 12px; color: #87A96B; margin-bottom: 4px;">${index + 1}</div>
          <div style="font-weight: 600;">${word}</div>
        `;
        seedDisplay.appendChild(seedItem);
      });
    }

    function goToSymmetryStep(step) {
      document.getElementById('symmetryStep1').style.display = step === 1 ? 'block' : 'none';
      document.getElementById('symmetryStep2').style.display = step === 2 ? 'block' : 'none';
      document.getElementById('symmetryStep3').style.display = step === 3 ? 'block' : 'none';
      document.getElementById('symmetryStep4').style.display = step === 4 ? 'block' : 'none';
      if (step === 1) {
        document.getElementById('recoveryError').style.display = 'none';
      }
    }

    function goToSeedStep() {
      const nameInput = document.getElementById('symmetryName');
      const name = nameInput.value.trim();
      
      if (!name) {
        alert('Please enter your preferred name');
        return;
      }
      
      // Generate and display seed
      generateRecoverySeed();
      displaySeed();
      
      // Switch to step 2
      document.getElementById('symmetryStep1').style.display = 'none';
      document.getElementById('symmetryStep2').style.display = 'block';
    }
    
    function goToRestoreStep() {
      // Generate 12 recovery inputs
      const recoveryInputs = document.getElementById('recoveryInputs');
      recoveryInputs.innerHTML = '';
      
      for (let i = 0; i < 12; i++) {
        const inputContainer = document.createElement('div');
        inputContainer.className = 'symmetry-field';
        inputContainer.innerHTML = `
          <label class="symmetry-label">Word ${i + 1}</label>
          <input type="text" class="symmetry-input" id="recoveryWord${i}" placeholder="Enter word ${i + 1}" autocomplete="off">
        `;
        recoveryInputs.appendChild(inputContainer);
      }
      
      // Hide error
      document.getElementById('recoveryError').style.display = 'none';
      
      // Switch to step 4
      document.getElementById('symmetryStep1').style.display = 'none';
      document.getElementById('symmetryStep4').style.display = 'block';
    }
    
    // Recovery Functions
    async function restoreSymmetry() {
      const recoveryWords = [];
      for (let i = 0; i < 12; i++) {
        const word = document.getElementById(`recoveryWord${i}`).value.trim().toLowerCase();
        if (!word) {
          document.getElementById('recoveryError').style.display = 'block';
          return;
        }
        recoveryWords.push(word);
      }

      try {
        const mnemonic = recoveryWords.join(' ');
        const isValid = bip39.validateMnemonic(mnemonic);
        if (!isValid) {
          document.getElementById('recoveryError').style.display = 'block';
          return;
        }

        const remoteUrl = localStorage.getItem('symmetryRemoteUrl');
        if (remoteUrl) {
          try {
            const seed = bip39.mnemonicToSeedSync(mnemonic);
            const sageId = await generateSageIdFromSeed(seed);
            await luamDB.replicate.from(remoteUrl, {
              filter: function(doc) {
                return doc.ownerId === sageId || !doc.ownerId;
              }
            });
            completeRestore({ sageId, recoveryWords });
            return;
          } catch (error) {
            console.log('Remote sync failed, prompting for backup file:', error);
          }
        }

        document.getElementById('backupUploadSection').style.display = 'block';
        document.getElementById('recoveryError').style.display = 'none';
      } catch (error) {
        console.error('Restore failed:', error);
        document.getElementById('recoveryError').style.display = 'block';
      }
    }

    async function generateSageIdFromSeed(seedBuffer) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', seedBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return 'SAGE-' + hashHex.substring(0, 8).toUpperCase();
    }

    function completeRestore({ sageId, recoveryWords, preferredName }) {
      const prefs = {
        preferredName: preferredName || localStorage.getItem('userName') || 'Explorer',
        sageId: sageId,
        recoverySeed: recoveryWords,
        restoredAt: new Date().toISOString()
      };
      localStorage.setItem('luam_client_prefs', JSON.stringify(prefs));
      localStorage.setItem('symmetrySageId', sageId);
      localStorage.setItem('userName', prefs.preferredName);

      const sageIdInput = document.getElementById('symmetrySageId');
      if (sageIdInput) sageIdInput.value = sageId;

      mirrorSync(prefs.preferredName);
      closeSymmetryModal();
      showSkillUp('Symmetry Restored');
      setTimeout(() => location.reload(), 600);
    }

    // Backup file upload handler
    document.getElementById('backupFileInput').addEventListener('change', async function(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        const reader = new FileReader();
        reader.onload = async function(e) {
          try {
            const backupData = JSON.parse(e.target.result);
            const recoveryWords = [];
            for (let i = 0; i < 12; i++) {
              const word = document.getElementById(`recoveryWord${i}`).value.trim().toLowerCase();
              recoveryWords.push(word);
            }

            const mnemonic = recoveryWords.join(' ');
            if (!bip39.validateMnemonic(mnemonic)) {
              document.getElementById('recoveryError').style.display = 'block';
              return;
            }

            let sageId = backupData.sageId || backupData.preferences?.sageId;
            if (!sageId) {
              const seed = bip39.mnemonicToSeedSync(mnemonic);
              sageId = await generateSageIdFromSeed(seed);
            }

            await restoreFromBackup(backupData, recoveryWords, sageId);
            
          } catch (error) {
            console.error('Backup file parsing failed:', error);
            document.getElementById('recoveryError').style.display = 'block';
          }
        };
        reader.readAsText(file);
        
      } catch (error) {
        console.error('File reading failed:', error);
        document.getElementById('recoveryError').style.display = 'block';
      }
    });
    
    async function restoreFromBackup(backupData, recoveryWords, sageId) {
      try {
        for (const doc of backupData.documents || []) {
          try {
            await luamDB.put(doc);
          } catch (error) {
            console.log('Document already exists:', doc._id);
          }
        }

        completeRestore({
          sageId,
          recoveryWords,
          preferredName: backupData.preferredName || backupData.preferences?.preferredName
        });
      } catch (error) {
        console.error('Restore from backup failed:', error);
        document.getElementById('recoveryError').style.display = 'block';
      }
    }

    async function refreshSymmetryData() {
      try {
        if (typeof updateSymmetryChart === 'function') {
          await updateSymmetryChart();
        }
      } catch (error) {
        console.error('Error refreshing symmetry data:', error);
      }
    }

    async function refreshMomentumHistory() {
      try {
        await loadRecentWins();
        await loadDailyMomentum();
      } catch (error) {
        console.error('Error refreshing momentum history:', error);
      }
    }

    function goToVerificationStep() {
      // Select 3 random positions for verification
      verificationIndices = [];
      const positions = new Set();
      
      while (positions.size < 3) {
        const randomPos = Math.floor(Math.random() * 12);
        positions.add(randomPos);
      }
      
      verificationIndices = Array.from(positions).sort((a, b) => a - b);
      
      // Display positions
      document.getElementById('verificationPositions').textContent = verificationIndices.map(i => i + 1).join(', ');
      
      // Generate verification inputs
      const verificationInputs = document.getElementById('verificationInputs');
      verificationInputs.innerHTML = '';
      
      verificationIndices.forEach((index, i) => {
        const inputContainer = document.createElement('div');
        inputContainer.className = 'symmetry-field';
        inputContainer.innerHTML = `
          <label class="symmetry-label">Word at position ${index + 1}</label>
          <input type="text" class="symmetry-input" id="verifyWord${i}" placeholder="Enter word at position ${index + 1}">
        `;
        verificationInputs.appendChild(inputContainer);
      });
      
      // Switch to step 3
      document.getElementById('symmetryStep2').style.display = 'none';
      document.getElementById('symmetryStep3').style.display = 'block';
    }

    function verifySeed() {
      let allCorrect = true;
      
      verificationIndices.forEach((index, i) => {
        const input = document.getElementById(`verifyWord${i}`);
        const enteredWord = input.value.trim().toLowerCase();
        const correctWord = recoverySeed[index].toLowerCase();
        
        if (enteredWord !== correctWord) {
          allCorrect = false;
          input.style.borderColor = '#ef4444';
        } else {
          input.style.borderColor = '#87A96B';
        }
      });
      
      if (!allCorrect) {
        alert('Some words are incorrect. Please try again.');
        return;
      }
      
      // Verification successful - save everything
      confirmSymmetryWithSeed();
    }

    function downloadSeed() {
      const seedText = recoverySeed.join(' ');
      const blob = new Blob([`Luam Wellness Recovery Seed\n\n${seedText}\n\nKeep this safe. You'll need it to recover your data.`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'luam-recovery-seed.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function printSeed() {
      const seedText = recoverySeed.join(' ');
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
        <head>
          <title>Luam Wellness Recovery Seed</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #87A96B; border-bottom: 2px solid #87A96B; padding-bottom: 10px; }
            .seed-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
            .seed-item { background: #f5f5f0; border: 1px solid #87A96B; border-radius: 8px; padding: 12px; text-align: center; }
            .position { font-size: 12px; color: #87A96B; margin-bottom: 4px; }
            .word { font-weight: bold; font-size: 16px; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Luam Wellness Recovery Seed</h1>
          <p>Write down these 12 words in a safe place. You'll need them to recover your data.</p>
          <div class="seed-grid">
            ${recoverySeed.map((word, index) => `
              <div class="seed-item">
                <div class="position">${index + 1}</div>
                <div class="word">${word}</div>
              </div>
            `).join('')}
          </div>
          <div class="warning">
            <strong>⚠️ Important:</strong> Keep this seed safe and secure. Anyone with access to these words can access your data.
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }

    function confirmSymmetryWithSeed() {
      const nameInput = document.getElementById('symmetryName');
      const sageIdInput = document.getElementById('symmetrySageId');
      const name = nameInput.value.trim();
      const sageId = sageIdInput.value;

      // Save to localStorage
      const clientPrefs = {
        preferredName: name,
        sageId: sageId,
        recoverySeed: recoverySeed,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('luam_client_prefs', JSON.stringify(clientPrefs));
      
      // Save userName for greeting functionality
      localStorage.setItem('userName', name);

      // Mirror sync - update welcome header
      mirrorSync(name);

      // Close modal
      closeSymmetryModal();
    }

    function openSymmetryModal() {
      const modal = document.getElementById('symmetryModal');
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Generate and display Sage ID
      const sageId = generateSageId();
      document.getElementById('symmetrySageId').value = sageId;

      // Reset to step 1
      document.getElementById('symmetryStep1').style.display = 'block';
      document.getElementById('symmetryStep2').style.display = 'none';
      document.getElementById('symmetryStep3').style.display = 'none';

      // Set title for new user
      document.getElementById('symmetryTitle').textContent = 'Welcome, Explorer';
    }

    function openSymmetryModalForEdit() {
      const modal = document.getElementById('symmetryModal');
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Load existing preferences
      const clientPrefs = localStorage.getItem('luam_client_prefs');
      if (clientPrefs) {
        try {
          const prefs = JSON.parse(clientPrefs);
          document.getElementById('symmetryName').value = prefs.preferredName || '';
          document.getElementById('symmetrySageId').value = prefs.sageId || generateSageId();
        } catch (e) {
          document.getElementById('symmetryName').value = '';
          document.getElementById('symmetrySageId').value = generateSageId();
        }
      } else {
        document.getElementById('symmetryName').value = '';
        document.getElementById('symmetrySageId').value = generateSageId();
      }

      // Show only step 1 for editing (skip seed generation)
      document.getElementById('symmetryStep1').style.display = 'block';
      document.getElementById('symmetryStep2').style.display = 'none';
      document.getElementById('symmetryStep3').style.display = 'none';

      // Change button to direct confirm for editing
      document.querySelector('#symmetryStep1 .symmetry-btn').textContent = 'Update Profile';
      document.querySelector('#symmetryStep1 .symmetry-btn').onclick = confirmSymmetryEdit;

      // Set title for editing
      document.getElementById('symmetryTitle').textContent = 'Edit Your Profile';
    }

    function confirmSymmetryEdit() {
      const nameInput = document.getElementById('symmetryName');
      const sageIdInput = document.getElementById('symmetrySageId');
      const name = nameInput.value.trim();
      const sageId = sageIdInput.value;

      if (!name) {
        alert('Please enter your preferred name');
        return;
      }

      // Get existing prefs to preserve seed
      const existingPrefs = localStorage.getItem('luam_client_prefs');
      let existingSeed = [];
      if (existingPrefs) {
        try {
          const prefs = JSON.parse(existingPrefs);
          existingSeed = prefs.recoverySeed || [];
        } catch (e) {
          console.error('Error loading existing preferences:', e);
        }
      }

      // Save to localStorage
      const clientPrefs = {
        preferredName: name,
        sageId: sageId,
        recoverySeed: existingSeed,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('luam_client_prefs', JSON.stringify(clientPrefs));
      
      // Save userName for greeting functionality
      localStorage.setItem('userName', name);

      // Mirror sync - update welcome header
      mirrorSync(name);

      // Close modal
      closeSymmetryModal();

      // Reset button for new users
      document.querySelector('#symmetryStep1 .symmetry-btn').textContent = 'Continue to Recovery Seed';
      document.querySelector('#symmetryStep1 .symmetry-btn').onclick = goToSeedStep;
    }

    function closeSymmetryModal() {
      const modal = document.getElementById('symmetryModal');
      modal.classList.remove('active');
      document.body.style.overflow = '';

      // Reset to step 1
      document.getElementById('symmetryStep1').style.display = 'block';
      document.getElementById('symmetryStep2').style.display = 'none';
      document.getElementById('symmetryStep3').style.display = 'none';
      document.getElementById('symmetryStep4').style.display = 'none';

      // Reset button for new users
      document.querySelector('#symmetryStep1 .symmetry-btn').textContent = 'Continue to Recovery Seed';
      document.querySelector('#symmetryStep1 .symmetry-btn').onclick = goToSeedStep;
    }

    // Web Crypto API Encryption/Decryption Functions
    function uint8ArrayToBase64(bytes) {
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    }

    async function deriveKeyFromSeed(seedWords) {
      const seedString = seedWords.join(' ');
      const encoder = new TextEncoder();
      const seedData = encoder.encode(seedString);
      
      // Import seed as key material
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        seedData,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      // Derive a cryptographic key
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('luam-wellness-salt'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      
      return key;
    }

    async function encryptData(data) {
      const clientPrefs = localStorage.getItem('luam_client_prefs');
      if (!clientPrefs) {
        throw new Error('No recovery seed found');
      }
      
      const prefs = JSON.parse(clientPrefs);
      if (!prefs.recoverySeed || prefs.recoverySeed.length === 0) {
        throw new Error('No recovery seed found');
      }
      
      const key = await deriveKeyFromSeed(prefs.recoverySeed);
      const encoder = new TextEncoder();
      const dataEncoded = encoder.encode(JSON.stringify(data));
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataEncoded
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);
      
      // Convert to base64
      const base64 = uint8ArrayToBase64(combined);
      return base64;
    }

    async function decryptData(encryptedBase64) {
      const clientPrefs = localStorage.getItem('luam_client_prefs');
      if (!clientPrefs) {
        throw new Error('No recovery seed found');
      }
      
      const prefs = JSON.parse(clientPrefs);
      if (!prefs.recoverySeed || prefs.recoverySeed.length === 0) {
        throw new Error('No recovery seed found');
      }
      
      const key = await deriveKeyFromSeed(prefs.recoverySeed);
      
      // Convert from base64
      const combined = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encryptedData = combined.slice(12);
      
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encryptedData
      );
      
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decryptedData);
      return JSON.parse(jsonString);
    }

    function confirmSymmetry() {
      // This function is now replaced by confirmSymmetryWithSeed
      // Kept for backward compatibility
      confirmSymmetryWithSeed();
    }

    function mirrorSync(name) {
      // Update the greeting header with time-based greeting
      updateGreeting();

      // Update profile name if exists
      const profileName = document.getElementById('profileName');
      if (profileName) {
        profileName.textContent = name;
      }
    }

    // Self-Check-in Modal Functions (Symmetry Pulse)
    function smoothScrollToAppointments(event) {
      event.preventDefault();
      const appointmentsSection = document.getElementById('appointments');
      if (appointmentsSection) {
        appointmentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function openCheckInModal() {
      const modal = document.getElementById('checkInModal');
      if (!modal) return;
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      resetSymmetryPulse();
    }

    function closeCheckInModal() {
      const modal = document.getElementById('checkInModal');
      if (!modal) return;
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }

    // Symmetry Pulse Step Navigation
    let currentStep = 1;
    let pulseData = {
      mood: 5,
      energy: 5,
      sleep: 5,
      phq1: null,
      phq2: null,
      gad1: null,
      gad2: null,
      contextTags: [],
      notes: ''
    };

    function goToStep(step) {
      // Hide all steps
      document.querySelectorAll('.step-content').forEach(el => {
        el.style.display = 'none';
      });
      
      // Show target step
      document.getElementById(`step${step}`).style.display = 'block';
      
      // Update progress bar
      document.querySelectorAll('.step-indicator').forEach(indicator => {
        const stepNum = parseInt(indicator.dataset.step);
        if (stepNum <= step) {
          indicator.style.background = '#22d3ee';
        } else {
          indicator.style.background = '#334155';
        }
      });
      
      currentStep = step;
      
      // Check safety trigger when moving to step 3
      if (step === 3) {
        checkSafetyTrigger();
      }
    }

    function updateSliderValue(type) {
      const slider = document.getElementById(`${type}Slider`);
      const valueSpan = document.getElementById(`${type}Value`);
      valueSpan.textContent = slider.value;
      pulseData[type] = parseInt(slider.value);
    }

    function selectRating(btn) {
      const parent = btn.closest('.question-block');
      const questionId = parent.dataset.question;
      
      // Remove active class from all buttons in this question
      parent.querySelectorAll('.rating-btn').forEach(b => {
        b.classList.remove('active');
      });
      
      // Add active class to clicked button
      btn.classList.add('active');
      
      // Store the value
      pulseData[questionId] = parseInt(btn.dataset.value);
    }

    function toggleContextChip(chip) {
      const tag = chip.dataset.tag;
      chip.classList.toggle('active');
      
      if (chip.classList.contains('active')) {
        if (!pulseData.contextTags.includes(tag)) {
          pulseData.contextTags.push(tag);
        }
      } else {
        pulseData.contextTags = pulseData.contextTags.filter(t => t !== tag);
      }
    }

    function calculateSymmetryScore() {
      const phq1 = pulseData.phq1 || 0;
      const phq2 = pulseData.phq2 || 0;
      const gad1 = pulseData.gad1 || 0;
      const gad2 = pulseData.gad2 || 0;
      return phq1 + phq2 + gad1 + gad2;
    }

    function checkSafetyTrigger() {
      const score = calculateSymmetryScore();
      const supportTrigger = document.getElementById('supportTrigger');
      
      if (score > 6) {
        supportTrigger.style.display = 'block';
      } else {
        supportTrigger.style.display = 'none';
      }
    }

    function resetSymmetryPulse() {
      currentStep = 1;
      pulseData = {
        mood: 5,
        energy: 5,
        sleep: 5,
        phq1: null,
        phq2: null,
        gad1: null,
        gad2: null,
        contextTags: [],
        notes: ''
      };
      
      // Reset sliders
      document.getElementById('moodSlider').value = 5;
      document.getElementById('energySlider').value = 5;
      document.getElementById('sleepSlider').value = 5;
      document.getElementById('moodValue').textContent = '5';
      document.getElementById('energyValue').textContent = '5';
      document.getElementById('sleepValue').textContent = '5';
      
      // Reset rating buttons
      document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Reset context chips
      document.querySelectorAll('.context-chip').forEach(chip => {
        chip.classList.remove('active');
      });
      
      // Reset notes
      document.getElementById('pulseNotes').value = '';
      
      // Hide support trigger
      document.getElementById('supportTrigger').style.display = 'none';
      
      // Go to step 1
      goToStep(1);
    }

    async function saveSelfCheckinEntry(entry) {
      if (!luamDB || !luamDB.put) {
        return null;
      }
      try {
        const doc = {
          _id: `self_checkin_${Date.now()}`,
          type: 'self_checkin',
          timestamp: new Date().toISOString(),
          mood: Number(entry.mood),
          sleep: Number(entry.sleep),
          energy: Number(entry.energy),
          phq1: Number(entry.phq1 || 0),
          phq2: Number(entry.phq2 || 0),
          gad1: Number(entry.gad1 || 0),
          gad2: Number(entry.gad2 || 0),
          contextTags: Array.isArray(entry.contextTags) ? entry.contextTags : [],
          notes: entry.notes || '',
          symmetryScore: Number(entry.symmetryScore || 0)
        };
        await luamDB.put(doc);
        return doc;
      } catch (error) {
        console.error('saveSelfCheckinEntry failed:', error);
        return null;
      }
    }

    async function submitSymmetryPulse() {
      pulseData.notes = document.getElementById('pulseNotes').value;
      const score = calculateSymmetryScore();
      
      const pulseEntry = {
        timestamp: new Date().toISOString(),
        ...pulseData,
        symmetryScore: score
      };
      
      let savedDoc = null;
      let savedToLocal = false;
      let savedToPouch = false;

      try {
        let pulseHistory = JSON.parse(localStorage.getItem('luam_pulse_history') || '[]');
        pulseHistory.push(pulseEntry);
        localStorage.setItem('luam_pulse_history', JSON.stringify(pulseHistory));
        savedToLocal = true;

        savedDoc = await saveSelfCheckinEntry(pulseEntry);
        if (savedDoc) {
          savedToPouch = true;
          if (window.refreshOverviewMetrics) {
            window.refreshOverviewMetrics();
          }
        }

        if (sageMoodChart) {
          sageMoodData.shift();
          sageMoodData.push(pulseData.mood);
          updateSageChart();
        }

        showToast('Symmetry Pulse completed successfully!', 'success');
      } catch (error) {
        console.error('Symmetry Pulse save failed:', error);
        showToast('Unable to save Symmetry Pulse data right now. Try again in a moment.', 'error');
      } finally {
        closeCheckInModal();
        resetSageIdleTimer();
      }

      if (savedToPouch && window.switchSymmetryTab) {
        window.switchSymmetryTab(currentSymmetryTab);
      }
    }

    // Care Plan Modal Functions
    function openCarePlanModal() {
      const modal = document.getElementById('carePlanModal');
      if (!modal) return;
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }

    function closeCarePlanModal() {
      const modal = document.getElementById('carePlanModal');
      if (!modal) return;
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }

    function submitCheckIn() {
      const notes = document.getElementById('checkInNotes').value;
      const selectedMood = document.querySelector('#checkInModal .btn[data-mood].active');
      
      if (!selectedMood) {
        alert('Please select a mood');
        return;
      }

      const mood = selectedMood.dataset.mood;
      const intensity = mood === 'Low' ? 3 : mood === 'Fair' ? 5 : mood === 'Good' ? 7 : 9;

      // Save to PouchDB
      saveMoodReflection({
        mood: mood,
        intensity: intensity,
        notes: notes
      }).then(() => {
        alert('Check-in saved successfully!');
        closeCheckInModal();
        document.getElementById('checkInNotes').value = '';
        // Remove active class from mood buttons
        document.querySelectorAll('#checkInModal .btn[data-mood]').forEach(btn => {
          btn.classList.remove('active');
        });
        if (window.switchSymmetryTab) {
          switchSymmetryTab(currentSymmetryTab);
        }
      }).catch(error => {
        console.error('Error saving check-in:', error);
        alert('Error saving check-in. Please try again.');
      });
    }

    // Add click handlers for mood buttons in check-in modal
    document.addEventListener('DOMContentLoaded', function() {
      const checkInModal = document.getElementById('checkInModal');
      if (checkInModal) {
        checkInModal.querySelectorAll('.btn[data-mood]').forEach(btn => {
          btn.addEventListener('click', function() {
            checkInModal.querySelectorAll('.btn[data-mood]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
          });
        });
      }
    });

    // Auto-trigger on page load
    document.addEventListener('DOMContentLoaded', function() {
      const clientPrefs = localStorage.getItem('luam_client_prefs');
      
      if (!clientPrefs) {
        // No name found, show modal
        setTimeout(() => {
          openSymmetryModal();
        }, 500);
      } else {
        // Load existing preferences
        try {
          const prefs = JSON.parse(clientPrefs);
          if (prefs.preferredName) {
            localStorage.setItem('userName', prefs.preferredName);
            mirrorSync(prefs.preferredName);
          }
        } catch (e) {
          console.error('Error loading client preferences:', e);
        }
      }

      // Close modal on escape
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeSymmetryModal();
        }
      });
    });