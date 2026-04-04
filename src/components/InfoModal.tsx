"use client";

import { useRef, useEffect, useCallback } from "react";
import { CloseIcon, HeartIcon, BookOpenIcon } from "@/components/icons";
import styles from "./InfoModal.module.css";

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function InfoModal({ open, onClose }: InfoModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = () => onClose();
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="info-modal-title"
      onClick={handleClick}
    >
      <div className={styles.header}>
        <h2 id="info-modal-title" className={styles.title}>
          DayroAozora
        </h2>
        <button
          className={styles.closeButton}
          type="button"
          aria-label="閉じる"
          onClick={onClose}
        >
          <CloseIcon size="1em" />
        </button>
      </div>

      <div className={styles.section}>
        <p className={styles.description}>
          毎日、青空文庫をお届け。
          <br />
          1日1冊、青空文庫の作品を一文ずつ読む体験を提供する Web アプリケーションです。
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>操作ガイド</h3>
        <ul className={styles.guideList}>
          <li>タップ（または Space / Enter）で一文ずつ読み進める</li>
          <li>スクロールで過去の文に戻れる</li>
          <li><HeartIcon size="0.875em" className={styles.inlineIcon} /> ボタンで気に入った作品をお気に入りに追加</li>
          <li><BookOpenIcon size="0.875em" className={styles.inlineIcon} /> ボタンで本棚を開く</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>権利表記</h3>
        <p className={styles.license}>
          DayroAozora: MIT License
          <br />
          青空文庫メタデータ: CC BY 2.1 JP
          <br />
          本文テキスト: 著作権消滅作品（パブリックドメイン）
        </p>
      </div>
    </dialog>
  );
}
