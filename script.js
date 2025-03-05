$(document).ready(function () {
  let count = 0;
  let dialer_active = false;

  // Toggle dialer visibility
  $('#toggle-dialer').on('click', function () {
    $('#dialer').slideToggle(1000, function () {
      if ($('#dialer').is(':visible')) {
        dialer_active = true;
        console.log('active');
      } else {
        dialer_active = false;
        console.log('inactive');
      }
    });
  });


  // Function to play sound and append number
  function pressButton(num) {
    if (dialer_active) {
      const button = $(`.digit[data-number="${num}"]`);

      if (button.length && count < 11) {
        // Mouse click animation
        button.addClass('active');
        setTimeout(() => {
          button.removeClass('active');
        }, 200);

        let sound = new Audio(`https://www.soundjay.com/phone/sounds/cell-phone-1-nr${num}.mp3`); // Working sound ✅
        sound.currentTime = 0;
        sound.play();

        $('#output').append('<span>' + num + '</span>');
        count++;
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
