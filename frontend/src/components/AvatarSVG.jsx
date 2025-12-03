import React from 'react';
import ReactNiceAvatar from 'react-nice-avatar';

// Avatar configuration generator based on avatar ID
const getAvatarConfig = (avatarId) => {
  if (!avatarId) return null;

  const isMale = avatarId?.startsWith('male_');
  const isFemale = avatarId?.startsWith('female_');
  const avatarNum = parseInt(avatarId?.split('_')[1] || '1');

  // Base configuration
  const config = {
    sex: isMale ? 'man' : 'woman',
    faceColor: '#F9C9B6',
    earSize: 'big',
    eyeStyle: 'circle',
    noseStyle: 'short',
    mouthStyle: 'laugh',
    shirtStyle: 'polo',
    glassesStyle: 'none',
    hairColor: '#000',
    hairStyle: 'normal',
    hatStyle: 'none',
    hatColor: '#000',
    eyeBrowStyle: isMale ? 'up' : 'upWoman',
    shirtColor: '#9287FF',
    bgColor: '#F3F4F6',
    shape: 'circle',
  };

  // Skin tones (based on avatar number)
  const skinTones = ['#F9C9B6', '#E0A070', '#C68642', '#8D5524', '#654321'];
  if (avatarNum >= 7 && avatarNum <= 11) {
    config.faceColor = skinTones[avatarNum - 7];
  }

  // Hair colors
  const hairColors = ['#000', '#8B4513', '#D2691E', '#FFD700', '#FFFFFF'];
  if (avatarNum === 13 || avatarNum === 4) config.hairColor = hairColors[2]; // Red
  if (avatarNum === 17 || avatarNum === 2 || avatarNum === 15) config.hairColor = hairColors[3]; // Blond
  if (avatarNum === 15 || avatarNum === 13) config.hairColor = hairColors[4]; // White

  // Hair styles - using available options from react-nice-avatar
  if (isMale) {
    if (avatarNum === 14 || avatarNum === 12) config.hairStyle = 'thick'; // Thick hair
    if (avatarNum === 4 || avatarNum === 12) config.hairStyle = 'mohawk'; // Mohawk style
    // For bald (16), we'll use normal with very light hair color to simulate baldness
    if (avatarNum === 16) {
      config.hairStyle = 'normal';
      config.hairColor = config.faceColor; // Match skin tone for bald effect
    }
  } else {
    if (avatarNum === 12) config.hairStyle = 'womanShort';
    if (avatarNum === 2 || avatarNum === 15) config.hairStyle = 'womanLong';
    // For bald (14), match hair to skin tone
    if (avatarNum === 14) {
      config.hairStyle = 'normal';
      config.hairColor = config.faceColor;
    }
  }

  // Glasses
  if (avatarNum === 3 || avatarNum === 5 || avatarNum === 6) {
    config.glassesStyle = 'round';
  }

  // Professions and accessories
  if (avatarNum === 3 || avatarNum === 22) {
    config.shirtStyle = 'short';
    config.shirtColor = '#1F2937';
  }

  // Chef hat
  if ((isMale && avatarNum === 20) || (isFemale && avatarNum === 18)) {
    config.hatStyle = 'beanie';
    config.hatColor = '#FFFFFF';
  }

  // Construction hat
  if ((isMale && avatarNum === 19) || (isFemale && avatarNum === 17)) {
    config.hatStyle = 'turban';
    config.hatColor = '#FFD700';
  }

  // Scientist/Doctor
  if ((isMale && avatarNum === 23) || (isFemale && avatarNum === 21)) {
    config.shirtStyle = 'hoody';
    config.shirtColor = '#FFFFFF';
  }

  // Tuxedo/Professional
  if (isMale && avatarNum === 18) {
    config.shirtStyle = 'short';
    config.shirtColor = '#1F2937';
  }

  // Factory worker
  if ((isMale && avatarNum === 21) || (isFemale && avatarNum === 19)) {
    config.shirtStyle = 'polo';
    config.shirtColor = '#4B5563';
  }

  return config;
};

// AvatarSVG Component using react-nice-avatar
const AvatarSVG = ({ avatarId, size = 80, className = '' }) => {
  const config = getAvatarConfig(avatarId);

  if (!config) {
    // Fallback to default avatar
    return (
      <div
        className={`rounded-full bg-gray-300 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#9CA3AF" />
          <circle cx="35" cy="40" r="5" fill="#1F2937" />
          <circle cx="65" cy="40" r="5" fill="#1F2937" />
          <path
            d="M 30 60 Q 50 70, 70 60"
            stroke="#1F2937"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={className} style={{ width: size, height: size }}>
      <ReactNiceAvatar style={{ width: size, height: size }} {...config} />
    </div>
  );
};

export default AvatarSVG;
