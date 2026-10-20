package ru.sportplatform.identity.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import ru.sportplatform.common.enums.ApplicationStatus;
import ru.sportplatform.identity.domain.FriendRequest;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

    Optional<FriendRequest> findByFromUserIdAndToUserId(Long fromUserId, Long toUserId);

    List<FriendRequest> findByToUserIdAndStatusOrderByCreatedAtDesc(Long toUserId, ApplicationStatus status);

    List<FriendRequest> findByFromUserIdAndStatusOrderByCreatedAtDesc(Long fromUserId, ApplicationStatus status);

    @Query("select f from FriendRequest f where f.status = :status and (f.fromUserId = :userId or f.toUserId = :userId)")
    List<FriendRequest> findAcceptedForUser(@Param("userId") Long userId, @Param("status") ApplicationStatus status);
}
