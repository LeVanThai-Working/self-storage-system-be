import { Profile } from './profile.model.ts';
import { ProfileRepository } from './profile.repository.ts';
import { ProfileService } from './profile.service.ts';
import { ProfileController } from './profile.controller.ts';

// Export profileRepository so auth.container and user.container can share the same instance
export const profileRepository = new ProfileRepository(Profile);

const profileService = new ProfileService(profileRepository);

export const profileController = new ProfileController(profileService);
