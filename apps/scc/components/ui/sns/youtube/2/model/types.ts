export type YoutubeTwoCreator = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  subscribers: string;
};

export type YoutubeTwoVideo = {
  id: string;
  title: string;
  creatorId: string;
  thumbnail: string;
  alt: string;
  duration: string;
  views: string;
  published: string;
  description: string;
  topic: string;
  progress?: number;
  live?: boolean;
};

export type YoutubeTwoComment = {
  id: string;
  author: string;
  avatar: string;
  body: string;
  published: string;
  likes: string;
};
