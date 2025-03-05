$(document).ready(function () {
  let count = 0;
  let dialer_active = false;

  // Toggle dialer visibility
  $('#toggle-dialer').on('click', function () {
    $('.softphone_header').css('border-radius', '0 0 0 0');
    $('#dialer').slideToggle(1000, function () {
      if ($('#dialer').is(':visible')) {
        dialer_active = true;
        $('.softphone_arrow').css('transform', 'rotate(0deg)');
        $('.softphone_header').css('border-radius', '0 0 0 0');
        console.log('active');
      } else {
        dialer_active = false;
        console.log('inactive');
        $('.softphone_header').css('border-radius', '10px 10px 0 0');
        $('.softphone_arrow').css('transform', 'rotate(180deg)');
      }
    });
  });


  // Function to play sound and append number
  function pressButton(num) {
    if (dialer_active) {
      const button = $(`.digit[data-number="${num}"]`);


      // Mouse click animation
      button.addClass('active');
      setTimeout(() => {
        button.removeClass('active');
      }, 200);
      //console.log(num);
      const sound_digit = /^[0-9*#]$/.test(num) ? 1 : num;
      let sound = new Audio(`https://www.soundjay.com/phone/sounds/cell-phone-1-nr${sound_digit}.mp3`); // Working sound ✅
      sound.currentTime = 0;
      sound.play();

      let current = $('#output').val();

      if (!$('#output').is(':focus')) {
        $('#output').val(current + num);
      }

    }

  }

  // Dialer Click Event
  $('.digit').on('click', function () {
    let num = $(this).data('number');
    pressButton(num); // Only call the pressButton function here
  });

  // Keyboard Event (0-9, *, #)
  $(document).on('keydown', function (e) {
    if (dialer_active) {
      let key = e.key;
      if (/^[0-9*#]$/.test(key)) {
        pressButton(key);
      }
      if (e.key === 'Backspace') {
        $('#output span:last-child').remove();
        if (count > 0) {
          count--;
        }
      }
    }
  });

  // Delete Last Digit (Button Click)
  $('#delete-button').on('click', function () {

    $('#output span:last-child').remove();
    if (count > 0) {
      count--;
    }


  });

  // Call button functionality
  $('#call-button').on('click', function () {
    const number = $('#output').text();
    if (number) {
      alert('📞 Calling: ' + number);
      $('#output').text('');
      count = 0;
    } else {
      alert('❌ Please enter a number first!');
    }
  });
});
