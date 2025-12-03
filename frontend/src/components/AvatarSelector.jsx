import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import AvatarSVG from './AvatarSVG';

// Avatar options - using custom SVG avatars
const AVATARS = {
  male: [
    { id: 'male_1', name: 'Man' },
    { id: 'male_2', name: 'Person' },
    { id: 'male_3', name: 'Businessman' },
    { id: 'male_4', name: 'Bearded Man' },
    { id: 'male_5', name: 'Student' },
    { id: 'male_6', name: 'Technologist' },
    { id: 'male_7', name: 'Man: Light Skin' },
    { id: 'male_8', name: 'Man: Medium-Light Skin' },
    { id: 'male_9', name: 'Man: Medium Skin' },
    { id: 'male_10', name: 'Man: Medium-Dark Skin' },
    { id: 'male_11', name: 'Man: Dark Skin' },
    { id: 'male_12', name: 'Man with Beard' },
    { id: 'male_13', name: 'Man: Red Hair' },
    { id: 'male_14', name: 'Man: Curly Hair' },
    { id: 'male_15', name: 'Man: White Hair' },
    { id: 'male_16', name: 'Man: Bald' },
    { id: 'male_17', name: 'Man: Blond Hair' },
    { id: 'male_18', name: 'Man: Tuxedo' },
    { id: 'male_19', name: 'Man: Construction Worker' },
    { id: 'male_20', name: 'Man: Chef' },
    { id: 'male_21', name: 'Man: Factory Worker' },
    { id: 'male_22', name: 'Man: Office Worker' },
    { id: 'male_23', name: 'Man: Scientist' },
    { id: 'male_24', name: 'Man: Mechanic' },
  ],
  female: [
    { id: 'female_1', name: 'Woman' },
    { id: 'female_2', name: 'Blonde Woman' },
    { id: 'female_3', name: 'Businesswoman' },
    { id: 'female_4', name: 'Redhead Woman' },
    { id: 'female_5', name: 'Student' },
    { id: 'female_6', name: 'Technologist' },
    { id: 'female_7', name: 'Woman: Light Skin' },
    { id: 'female_8', name: 'Woman: Medium-Light Skin' },
    { id: 'female_9', name: 'Woman: Medium Skin' },
    { id: 'female_10', name: 'Woman: Medium-Dark Skin' },
    { id: 'female_11', name: 'Woman: Dark Skin' },
    { id: 'female_12', name: 'Woman: Curly Hair' },
    { id: 'female_13', name: 'Woman: White Hair' },
    { id: 'female_14', name: 'Woman: Bald' },
    { id: 'female_15', name: 'Woman: Blond Hair' },
    { id: 'female_16', name: 'Woman: Veil' },
    { id: 'female_17', name: 'Woman: Construction Worker' },
    { id: 'female_18', name: 'Woman: Chef' },
    { id: 'female_19', name: 'Woman: Factory Worker' },
    { id: 'female_20', name: 'Woman: Office Worker' },
    { id: 'female_21', name: 'Woman: Scientist' },
    { id: 'female_22', name: 'Woman: Mechanic' },
    { id: 'female_23', name: 'Woman: Artist' },
    { id: 'female_24', name: 'Woman: Pilot' },
  ],
};

const AvatarSelector = ({ isOpen, onClose, currentAvatar, onSelect }) => {
  const [selectedGender, setSelectedGender] = useState('male');

  const handleSelect = (avatarId) => {
    onSelect(avatarId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Choose Your Avatar
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        {/* Gender Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSelectedGender('male')}
            className={`px-4 py-2 font-semibold transition-colors ${
              selectedGender === 'male'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Male Avatars
          </button>
          <button
            onClick={() => setSelectedGender('female')}
            className={`px-4 py-2 font-semibold transition-colors ${
              selectedGender === 'female'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Female Avatars
          </button>
        </div>

        {/* Avatar Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {AVATARS[selectedGender].map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => handleSelect(avatar.id)}
              className={`p-4 rounded-lg border-2 transition-all hover:scale-110 flex flex-col items-center ${
                currentAvatar === avatar.id
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary'
              }`}
            >
              <div className="mb-2 flex items-center justify-center w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                <AvatarSVG avatarId={avatar.id} size={64} />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-1">
                {avatar.name}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelector;
export { AVATARS };

