import { Image, type ImageStyle, type StyleProp } from 'react-native';

export type AppIconName =
  | 'profile'
  | 'notification'
  | 'news'
  | 'map'
  | 'mapPin'
  | 'clipboard'
  | 'video'
  | 'chat'
  | 'star'
  | 'globe'
  | 'lock'
  | 'help'
  | 'phone'
  | 'email'
  | 'chart'
  | 'sos'
  | 'firstAid'
  | 'users'
  | 'bullhorn'
  | 'check'
  | 'comments'
  | 'nurse'
  | 'clock'
  | 'pasteTick';

const ICONS: Record<AppIconName, any> = {
  profile: require('@/assets/images/Profile.png'),
  notification: require('@/assets/images/Notification.png'),
  news: require('@/assets/images/News.png'),
  map: require('@/assets/images/map-solid.png'),
  mapPin: require('@/assets/images/map-marked-alt-solid.png'),
  clipboard: require('@/assets/images/clipboard.png'),
  video: require('@/assets/images/Camera Video.png'),
  chat: require('@/assets/images/comments.png'),
  star: require('@/assets/images/Star.png'),
  globe: require('@/assets/images/globe.png'),
  lock: require('@/assets/images/Lock.png'),
  help: require('@/assets/images/question-circle-solid.png'),
  phone: require('@/assets/images/Phone.png'),
  email: require('@/assets/images/Email.png'),
  chart: require('@/assets/images/chart-up.png'),
  sos: require('@/assets/images/ambulance-solid.png'),
  firstAid: require('@/assets/images/first-aid.png'),
  users: require('@/assets/images/user-nurse-solid.png'),
  bullhorn: require('@/assets/images/bullhorn-solid.png'),
  check: require('@/assets/images/Check.png'),
  comments: require('@/assets/images/Comment Dots.png'),
  nurse: require('@/assets/images/user-nurse-solid.png'),
  clock: require('@/assets/images/Clock.png'),
  pasteTick: require('@/assets/images/paste-tick.png'),
};

type AppIconProps = {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
};

export function AppIcon({ name, size = 20, color, style }: AppIconProps) {
  return (
    <Image
      source={ICONS[name]}
      style={[
        {
          width: size,
          height: size,
          resizeMode: 'contain',
        },
        color ? { tintColor: color } : null,
        style,
      ]}
    />
  );
}
