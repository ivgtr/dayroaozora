import styles from "./EmptyBookshelf.module.css";

export default function EmptyBookshelf() {
  return (
    <div className={styles.container}>
      <div className={styles.shelf} />
      <div className={styles.shelf} />
      <div className={styles.shelf} />
      <p className={styles.message}>読了やお気に入りした作品がここに並びます</p>
    </div>
  );
}
