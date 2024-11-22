let currentAudioPlayer = null; // Текущий аудиоплеер
let audioContext, analyser, microphone, dataArray;

document.addEventListener("keydown", function (event) {
  if (event.code === "Space") {
    startVoiceSearch();
  }
});

function startVoiceSearch() {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "ru-RU";

  const soundCircle = document.getElementById("sound-circle");

  recognition.onstart = async function () {
    console.log("Голосовой поиск начат");

    // Показать круг с плавным увеличением
    soundCircle.style.opacity = "1";
    soundCircle.style.height = "200px";

    document.querySelectorAll("audio").forEach(audioElement => {
      audioElement.volume = 0.25;
    });

    document.getElementById("start-button").style.display = "none";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      microphone = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 256;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      microphone.connect(analyser);

      function updateSoundCircleHeight() {
        analyser.getByteFrequencyData(dataArray);
        const volume = Math.max(...dataArray);
        const height = Math.min(300, volume);
        soundCircle.style.height = `${height}px`;
        if (recognition.onstart) requestAnimationFrame(updateSoundCircleHeight);
      }
      updateSoundCircleHeight();
    } catch (error) {
      console.error("Ошибка доступа к микрофону: ", error);
    }
  };

  recognition.onresult = function (event) {
    const spokenText = event.results[0][0].transcript;
    console.log("Распознанный текст: ", spokenText);

    document.querySelectorAll("audio").forEach(audioElement => {
      audioElement.volume = 1;
    });

    const formattedQuery = capitalizeFirstLetter(spokenText);
    fetchSongData(formattedQuery);
  };

  recognition.onerror = function (event) {
    console.error("Ошибка распознавания речи: ", event.error);
  };

  recognition.onend = function () {
    console.log("Голосовой поиск завершен");

    // Скрыть круг с плавным уменьшением
    soundCircle.style.opacity = "0";
    soundCircle.style.height = "0";

    document.querySelectorAll("audio").forEach(audioElement => {
      audioElement.volume = 1;
    });

    document.getElementById("start-button").style.display = "inline-block";
  };

  recognition.start();
}

function fetchSongData(query) {
  const url = "https://api.qgram.ru";
  const data = {
    action: "list",
    search: query
  };

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })
    .then(response => response.json())
    .then(data => {
      if (data.status === "success" && data.songs.length > 0) {
        displaySongInfo(data.songs[0]);
      } else {
        console.log("Песня не найдена!");
      }
    })
    .catch(error => console.error("Ошибка при поиске песни: ", error));
}

function displaySongInfo(song) {
  if (currentAudioPlayer) {
    currentAudioPlayer.pause();
    currentAudioPlayer = null;
  }

  document.getElementById("song-info").style.display = "block";

  const formattedSongName = capitalizeFirstLetter(song.name);
  const formattedArtistName = capitalizeFirstLetter(song.artist);

  document.getElementById("song-name").innerText = formattedSongName;
  document.getElementById("song-artist").innerText = formattedArtistName;
  document.getElementById("cover").src = `https://api.qgram.ru/covers/${song.id}/maxresdefault.png`;

  const audioPlayer = new Audio(`https://api.qgram.ru/songs/${song.id}.wav`);
  audioPlayer.play();
  currentAudioPlayer = audioPlayer;

  audioPlayer.onended = function () {
    console.log("Воспроизведение завершено");
  };
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
