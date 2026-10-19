package ru.sportplatform.identity.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.identity.domain.UserAccount;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

    List<UserAccount> findByParentIdOrderByIdAsc(Long parentId);

    List<UserAccount> findByDemoTrueOrderByDemoOrderAscIdAsc();

    List<UserAccount> findAllByOrderByIdAsc();

    Optional<UserAccount> findFirstByEmailIgnoreCase(String email);
}
