export type LinkedinMember = {
  id: string;
  name: string;
  headline: string;
  avatar: string;
  mutuals?: string;
};

export type LinkedinPost = {
  id: string;
  authorId: string;
  audience: string;
  published: string;
  context?: string;
  body: string;
  image?: string;
  imageAlt?: string;
  link?: {
    source: string;
    title: string;
    description: string;
  };
  reactions: number;
  comments: number;
  reposts: number;
};

export type LinkedinNewsItem = {
  id: string;
  headline: string;
  readers: string;
};

export type LinkedinSuggestion = {
  id: string;
  memberId: string;
};

export type LinkedinFeedEntry = {
  id: string;
  post: LinkedinPost;
};
