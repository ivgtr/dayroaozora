import { BookOpenIcon } from "@/components/icons";
import styles from "./EmptyBookshelf.module.css";

export default function EmptyBookshelf() {
  return (
    <div className={styles.container}>
      <BookOpenIcon size={48} className={styles.icon} />
      <p className={styles.message}>
        読了やお気に入りした作品がここに並びます
      </p>
    </div>
  );
}
