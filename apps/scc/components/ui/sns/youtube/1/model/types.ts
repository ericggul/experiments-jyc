export type VideoCreator = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  subscribers: string;
};

export type VideoRecord = {
  id: string;
  title: string;
  creatorId: string;
  thumbnail: string;
  thumbnailAlt: string;
  duration: string;
  views: string;
  published: string;
  description: string;
  tags: string[];
  progress?: number;
  live?: boolean;
  chapters?: { id: string; label: string; at: string }[];
};

export type CommentRecord = {
  id: string;
  author: string;
  avatar: string;
  body: string;
  published: string;
  likes: string;
  replies?: CommentRecord[];
};

export type PlaylistRecord = {
  id: string;
  title: string;
  count: number;
  thumbnail: string;
  thumbnailAlt: string;
  updated: string;
};

export type ExploreCollection = {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  videoIds: string[];
};
