"use client";

import { useState } from "react";
import { instagramStoryRows } from "../model/data";
import type { InstagramStory } from "../model/types";
import styles from "./story-tray.module.css";

type StorySelection = InstagramStory;

function StoryPhoto({ image }: { image: string }) {
  return (
    <span
      aria-hidden="true"
      className={styles.referencePhoto}
      style={{ backgroundImage: `url("${image}")` }}
    />
  );
}

function StoryViewer({ onClose, story }: { onClose: () => void; story: StorySelection }) {
  return (
    <section aria-label={`${story.handle} story`} className={styles.storyViewer} role="dialog">
      <div className={styles.viewerProgress}><span /></div>
      <div className={styles.viewerHeader}>
        <span className={styles.viewerAvatar}><StoryPhoto image={story.image} /></span>
        <span>{story.handle}</span>
        <button aria-label="Close story" className={styles.viewerClose} onClick={onClose} type="button">×</button>
      </div>
      <div className={styles.viewerPortrait}><StoryPhoto image={story.image} /></div>
      <button className={styles.viewerDismissArea} onClick={onClose} type="button">Close story</button>
    </section>
  );
}

export function InstagramStoryTray() {
  const [selectedStory, setSelectedStory] = useState<StorySelection | null>(null);

  const openStory = (story: StorySelection) => {
    setSelectedStory(story);
  };

  return (
    <main aria-label="Instagram story rail" className={styles.screen}>
      <section aria-label="Stories" className={styles.storyTray}>
        <div className={styles.storyLayer}>
          {instagramStoryRows.map((stories, rowIndex) => (
            <div aria-label={`Story row ${rowIndex + 1}`} className={styles.storyRail} key={`story-row-${rowIndex}`} role="group">
              {stories.map((story) => (
                <button aria-label={story.handle} className={styles.story} key={story.id} onClick={() => openStory(story)} type="button">
                  <span className={styles.storyRing}>
                    <StoryPhoto image={story.image} />
                  </span>
                  <span className={styles.storyLabel}>{story.handle}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>

      {selectedStory ? <StoryViewer onClose={() => setSelectedStory(null)} story={selectedStory} /> : null}
    </main>
  );
}
