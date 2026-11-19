const analyzeSentiment = (text) => {
  if (!text || text.trim().length === 0) return 'Neutral';

  const lowerText = text.toLowerCase();

  const positiveWords = [
    // English
    'good', 'great', 'excellent', 'support', 'agree', 'beneficial',
    'helpful', 'yes', 'approve', 'wonderful', 'perfect', 'effective',
    'important', 'necessary', 'needed', 'useful', 'positive', 'right',
    // Filipino / Tagalog
    'sang-ayon', 'sumasangayon', 'suportahan', 'suporta', 'maganda',
    'mabuti', 'tama', 'maayos', 'napakabuti', 'kapaki-pakinabang',
    'kailangan', 'mahalaga', 'epektibo', 'pumapayag', 'pabor',
    'naniniwala', 'nais', 'gusto', 'mahusay', 'napakaganda',
  ];

  const negativeWords = [
    // English
    'bad', 'terrible', 'awful', 'oppose', 'disagree', 'harmful',
    'no', 'reject', 'against', 'wrong', 'useless', 'unfair',
    'corrupt', 'unjust', 'unnecessary', 'waste', 'negative',
    // Filipino / Tagalog
    'hindi', 'laban', 'mali', 'masama', 'ayaw', 'tutol', 'kontra',
    'tanggihan', 'mapanganib', 'walang-kwenta', 'di-makatarungan',
    'salungat', 'labag', 'masagwa', 'pabaya', 'basura', 'bulok',
    'hindi-tama', 'hindi-angkop', 'hindi-kailangan',
  ];

  let score = 0;

  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) score++;
  });

  negativeWords.forEach((word) => {
    if (lowerText.includes(word)) score--;
  });

  if (score > 0) return 'Positive';
  if (score < 0) return 'Negative';
  return 'Neutral';
};

module.exports = { analyzeSentiment };
