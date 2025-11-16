export const playSound = (audioUrl) => {
  const a = new Audio(audioUrl);
  a.play().catch(()=>{});
};

export const showBrowserNotification = (title, body) => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') new Notification(title, { body });
    });
  }
};
